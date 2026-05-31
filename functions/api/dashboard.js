import {
  careJson,
  careError,
  careTodayKst,
  careBuildTags,
  careRowToSubmission,
  careRowToSummary
} from "./_lib/care-utils.js";
import { careRequireStaff } from "./_lib/care-auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const session = await careRequireStaff(request, env);
    const db = env.CARE_DB;
    const today = careTodayKst();

    const rows = await db
      .prepare(
        `SELECT s.*, cs.summary_status
         FROM care_submissions s
         LEFT JOIN care_summaries cs ON cs.submission_id = s.id
         WHERE s.clinic_id = ? AND s.submitted_date = ?
         ORDER BY s.submitted_at DESC`
      )
      .bind(session.clinicId, today)
      .all();

    const submissions = (rows.results || []).map((row) => {
      const submission = careRowToSubmission(row);
      return {
        id: submission.id,
        name: submission.name,
        submittedAt: submission.submittedAt,
        currentMedication: submission.currentMedication,
        currentDose: submission.currentDose,
        currentWeightKg: submission.currentWeightKg,
        recentWeightChange: submission.recentWeightChange,
        summaryStatus: row.summary_status || "pending",
        tags: careBuildTags(submission)
      };
    });

    return careJson({
      ok: true,
      date: today,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    if (String(error.message) === "UNAUTHORIZED") {
      return careError("로그인이 필요합니다.", 401);
    }
    return careError("대시보드 조회 중 오류가 발생했습니다.", 500);
  }
}

export async function onRequestPost({ request, env }) {
  return onRequestGet({ request, env });
}
