import { careJson, careError, careRowToSubmission } from "./_lib/care-utils.js";
import { careRequireStaff, careInsertAudit } from "./_lib/care-auth.js";
import { careCreatePendingSummary, careGenerateAndSaveSummary } from "./_lib/care-ai.js";

export async function onRequestPost({ request, env }) {
  try {
    const session = await careRequireStaff(request, env);
    const db = env.CARE_DB;
    const body = await request.json();
    const submissionId = String(body.submissionId || "").trim();

    if (!submissionId) {
      return careError("submissionId가 필요합니다.", 400);
    }

    const submissionRow = await db
      .prepare(`SELECT * FROM care_submissions WHERE id = ? AND clinic_id = ?`)
      .bind(submissionId, session.clinicId)
      .first();

    if (!submissionRow) {
      return careError("제출 기록을 찾을 수 없습니다.", 404);
    }

    const existingSummary = await db
      .prepare(`SELECT summary_status FROM care_summaries WHERE submission_id = ?`)
      .bind(submissionId)
      .first();

    if (!existingSummary) {
      await careCreatePendingSummary(
        db,
        session.clinicId,
        submissionRow.patient_id,
        submissionId
      );
    } else {
      await db
        .prepare(
          `UPDATE care_summaries
           SET summary_status = 'pending', error_message = NULL, updated_at = datetime('now')
           WHERE submission_id = ?`
        )
        .bind(submissionId)
        .run();
    }

    const submission = careRowToSubmission(submissionRow);
    const result = await careGenerateAndSaveSummary(db, env, submission);

    await careInsertAudit(
      db,
      session.clinicId,
      session.staffUserId,
      "retry_summary",
      "careSubmission",
      submissionId
    );

    return careJson({
      ok: result.ok,
      summaryStatus: result.summaryStatus,
      error: result.error || null
    });
  } catch (error) {
    if (String(error.message) === "UNAUTHORIZED") {
      return careError("로그인이 필요합니다.", 401);
    }
    return careError("요약 재생성 중 오류가 발생했습니다.", 500);
  }
}
