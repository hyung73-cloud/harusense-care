import {
  careJson,
  careError,
  careRowToSubmission,
  careRowToSummary
} from "./_lib/care-utils.js";
import { careRequireStaff, careInsertAudit } from "./_lib/care-auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const session = await careRequireStaff(request, env);
    const db = env.CARE_DB;
    const url = new URL(request.url);
    const submissionId = String(url.searchParams.get("id") || "").trim();

    if (!submissionId) {
      return careError("submission id가 필요합니다.", 400);
    }

    const submissionRow = await db
      .prepare(`SELECT * FROM care_submissions WHERE id = ? AND clinic_id = ?`)
      .bind(submissionId, session.clinicId)
      .first();

    if (!submissionRow) {
      return careError("제출 기록을 찾을 수 없습니다.", 404);
    }

    const summaryRow = await db
      .prepare(`SELECT * FROM care_summaries WHERE submission_id = ? AND clinic_id = ?`)
      .bind(submissionId, session.clinicId)
      .first();

    const historyRows = await db
      .prepare(
        `SELECT id, submitted_at, submitted_date, current_weight_kg, current_medication, current_dose
         FROM care_submissions
         WHERE clinic_id = ? AND patient_id = ?
         ORDER BY submitted_at DESC
         LIMIT 6`
      )
      .bind(session.clinicId, submissionRow.patient_id)
      .all();

    await careInsertAudit(
      db,
      session.clinicId,
      session.staffUserId,
      "view_submission",
      "careSubmission",
      submissionId
    );

    return careJson({
      ok: true,
      submission: careRowToSubmission(submissionRow),
      summary: careRowToSummary(summaryRow),
      history: (historyRows.results || []).map((row) => ({
        id: row.id,
        submittedAt: row.submitted_at,
        submittedDate: row.submitted_date,
        currentWeightKg: row.current_weight_kg,
        currentMedication: row.current_medication,
        currentDose: row.current_dose
      }))
    });
  } catch (error) {
    if (String(error.message) === "UNAUTHORIZED") {
      return careError("로그인이 필요합니다.", 401);
    }
    return careError("상세 조회 중 오류가 발생했습니다.", 500);
  }
}
