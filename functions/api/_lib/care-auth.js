import { careNewId, careNowIso, careTodayKst } from "./care-utils.js";

export async function careHashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function careVerifyPassword(password, hash, salt) {
  const nextHash = await careHashPassword(password, salt);
  return nextHash === hash;
}

export async function careHashPatientKey(clinicId, name, birthDate, phoneLast4) {
  const raw = [
    clinicId,
    String(name || "").trim().toLowerCase(),
    birthDate || "",
    phoneLast4 || ""
  ].join("|");
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function careBase64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function careBase64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function careSign(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return careBase64UrlEncode(new Uint8Array(signature));
}

export async function careCreateSessionToken(payload, secret, maxAgeSeconds = 43200) {
  const header = careBase64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = careBase64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        ...payload,
        exp: Math.floor(Date.now() / 1000) + maxAgeSeconds
      })
    )
  );
  const unsigned = `${header}.${body}`;
  const signature = await careSign(unsigned, secret);
  return `${unsigned}.${signature}`;
}

export async function careVerifySessionToken(token, secret) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const unsigned = `${header}.${body}`;
  const expected = await careSign(unsigned, secret);
  if (signature !== expected) return null;

  const payload = JSON.parse(new TextDecoder().decode(careBase64UrlDecode(body)));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function careSessionCookie(token, maxAgeSeconds = 43200) {
  return `care_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

export function careClearSessionCookie() {
  return "care_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

export function careGetSessionTokenFromRequest(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)care_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function careRequireStaff(request, env) {
  const secret = env.CARE_SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET_MISSING");
  }

  const token = careGetSessionTokenFromRequest(request);
  const payload = await careVerifySessionToken(token, secret);
  if (!payload || !payload.staffUserId || !payload.clinicId) {
    throw new Error("UNAUTHORIZED");
  }

  return payload;
}

export async function careFindStaffByLogin(db, clinicId, loginId) {
  return db
    .prepare(
      `SELECT * FROM care_staff_users
       WHERE clinic_id = ? AND login_id = ? AND status = 'active'`
    )
    .bind(clinicId, loginId)
    .first();
}

export async function careUpdateStaffLogin(db, staffUserId) {
  await db
    .prepare(`UPDATE care_staff_users SET last_login_at = ? WHERE id = ?`)
    .bind(careNowIso(), staffUserId)
    .run();
}

export async function careFindOrCreatePatient(db, clinicId, input) {
  const now = careNowIso();
  const patientKey = await careHashPatientKey(
    clinicId,
    input.name,
    input.birthDate,
    input.phoneLast4
  );

  const existing = await db
    .prepare(`SELECT * FROM care_patients WHERE clinic_id = ? AND patient_key = ?`)
    .bind(clinicId, patientKey)
    .first();

  if (existing) {
    await db
      .prepare(
        `UPDATE care_patients
         SET updated_at = ?, last_submission_at = ?, name = ?, birth_date = ?, phone_last4 = ?
         WHERE id = ?`
      )
      .bind(now, now, input.name, input.birthDate, input.phoneLast4, existing.id)
      .run();
    return existing.id;
  }

  const patientId = careNewId("carePatient");
  await db
    .prepare(
      `INSERT INTO care_patients (
         id, clinic_id, name, birth_date, phone_last4, patient_key,
         created_at, updated_at, last_submission_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      patientId,
      clinicId,
      input.name,
      input.birthDate,
      input.phoneLast4,
      patientKey,
      now,
      now,
      now
    )
    .run();

  return patientId;
}

export async function careInsertAudit(db, clinicId, staffUserId, action, targetType, targetId) {
  await db
    .prepare(
      `INSERT INTO care_audit_logs (
         id, clinic_id, staff_user_id, action, target_type, target_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(careNewId("careAudit"), clinicId, staffUserId || null, action, targetType, targetId, careNowIso())
    .run();
}

export async function careEnsureActiveClinic(db, clinicId) {
  const clinic = await db
    .prepare(`SELECT id, name, status FROM care_clinics WHERE id = ?`)
    .bind(clinicId)
    .first();

  if (!clinic || clinic.status !== "active") {
    throw new Error("INVALID_CLINIC");
  }

  return clinic;
}

export { careTodayKst };
