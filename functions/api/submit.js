import {
  careJson,
  careError,
  careValidateSubmissionInput,
  careCheckRateLimit,
  careGetClientIp
} from "./_lib/care-utils.js";
import {
  careResolveTemplateParams,
  careValidateSubmissionForTemplate
} from "./_lib/care-templates.js";
import { careEnsureActiveClinic, careFindOrCreatePatient } from "./_lib/care-auth.js";
import {
  careInsertSubmission,
  careInsertConsent,
  careCreatePendingSummary,
  careGenerateAndSaveSummary
} from "./_lib/care-ai.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = env.CARE_DB;
    if (!db) {
      return careError("care DB가 설정되지 않았습니다.", 500);
    }

    const ip = careGetClientIp(request);
    await careCheckRateLimit(db, `submit:${ip}`, 8, 1);

    const body = await request.json();
    const clinicId = String(body.clinicId || "newsense").trim();
    await careEnsureActiveClinic(db, clinicId);

    const resolved = careResolveTemplateParams({
      templateId: body.templateId,
      visitNumber: body.visitNumber
    });

    const input =
      careValidateSubmissionForTemplate(body, resolved.templateId) ||
      careValidateSubmissionInput(body);

    const patientId = await careFindOrCreatePatient(db, clinicId, input);
    const submission = await careInsertSubmission(db, clinicId, patientId, input, resolved);
    await careInsertConsent(db, clinicId, submission.id);
    await careCreatePendingSummary(db, clinicId, patientId, submission.id);

    const summaryResult = await careGenerateAndSaveSummary(db, env, submission);

    return careJson({
      ok: true,
      submissionId: submission.id,
      summaryStatus: summaryResult.summaryStatus
    });
  } catch (error) {
    if (String(error.message) === "RATE_LIMIT") {
      return careError("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
    }
    if (String(error.message) === "INVALID_CLINIC") {
      return careError("유효하지 않은 클리닉입니다.", 404);
    }
    return careError(error.message || "제출 처리 중 오류가 발생했습니다.", 400);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}
