import { careJson, careError, careSanitizeText } from "./_lib/care-utils.js";
import {
  careEnsureActiveClinic,
  careFindStaffByLogin,
  careUpdateStaffLogin,
  careInsertAudit,
  careCreateSessionToken,
  careVerifyPassword,
  careSessionCookie
} from "./_lib/care-auth.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = env.CARE_DB;
    const secret = env.CARE_SESSION_SECRET;
    const salt = env.CARE_PASSWORD_SALT;

    if (!db || !secret || !salt) {
      return careError("care 서버 설정이 완료되지 않았습니다.", 500);
    }

    const body = await request.json();
    const clinicId = String(body.clinicId || "newsense").trim();
    const loginId = careSanitizeText(body.loginId || body.staffId, 80);
    const password = String(body.password || "");

    if (!loginId || !password) {
      return careError("아이디와 비밀번호를 입력해주세요.", 400);
    }

    await careEnsureActiveClinic(db, clinicId);
    const staff = await careFindStaffByLogin(db, clinicId, loginId);
    if (!staff) {
      return careError("아이디 또는 비밀번호를 확인해주세요.", 401);
    }

    const valid = await careVerifyPassword(password, staff.password_hash, salt);
    if (!valid) {
      return careError("아이디 또는 비밀번호를 확인해주세요.", 401);
    }

    await careUpdateStaffLogin(db, staff.id);
    await careInsertAudit(db, clinicId, staff.id, "login", "careStaffUser", staff.id);

    const token = await careCreateSessionToken(
      {
        staffUserId: staff.id,
        clinicId: staff.clinic_id,
        loginId: staff.login_id,
        role: staff.role
      },
      secret
    );

    return careJson(
      {
        ok: true,
        clinicId: staff.clinic_id,
        loginId: staff.login_id,
        role: staff.role
      },
      200,
      { "set-cookie": careSessionCookie(token) }
    );
  } catch (error) {
    if (String(error.message) === "INVALID_CLINIC") {
      return careError("유효하지 않은 클리닉입니다.", 404);
    }
    return careError("로그인 처리 중 오류가 발생했습니다.", 500);
  }
}
