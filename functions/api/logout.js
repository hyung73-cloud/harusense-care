import { careJson } from "./_lib/care-utils.js";
import { careClearSessionCookie, careRequireStaff, careInsertAudit } from "./_lib/care-auth.js";

export async function onRequestPost({ request, env }) {
  try {
    const session = await careRequireStaff(request, env);
    await careInsertAudit(
      env.CARE_DB,
      session.clinicId,
      session.staffUserId,
      "logout",
      "careStaffUser",
      session.staffUserId
    );
  } catch (_error) {
    // 세션이 없어도 쿠키는 지웁니다.
  }

  return careJson({ ok: true }, 200, { "set-cookie": careClearSessionCookie() });
}
