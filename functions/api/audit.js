import { careJson, careError, careSanitizeText } from "./_lib/care-utils.js";
import { careRequireStaff, careInsertAudit } from "./_lib/care-auth.js";

export async function onRequestPost({ request, env }) {
  try {
    const session = await careRequireStaff(request, env);
    const body = await request.json();
    const action = careSanitizeText(body.action, 80);
    const targetType = careSanitizeText(body.targetType, 80);
    const targetId = careSanitizeText(body.targetId, 120);

    if (!action || !targetId) {
      return careError("audit 정보가 부족합니다.", 400);
    }

    await careInsertAudit(
      env.CARE_DB,
      session.clinicId,
      session.staffUserId,
      action,
      targetType,
      targetId
    );

    return careJson({ ok: true });
  } catch (error) {
    if (String(error.message) === "UNAUTHORIZED") {
      return careError("로그인이 필요합니다.", 401);
    }
    return careError("감사 로그 저장 중 오류가 발생했습니다.", 500);
  }
}
