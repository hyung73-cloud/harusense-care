import {
  careNewId,
  careNowIso,
  careStringifyJsonArray,
  careValidateSummaryOutput,
  careBoolToInt
} from "./care-utils.js";

const CARE_AI_SYSTEM_PROMPT_FOLLOWUP = `당신은 비만 재진 follow-up 문진을 의사 상담 참고용으로 정리하는 보조 도구입니다.

생성 가능:
- patientStatusSummary: 환자 상태 요약 (2~3문장)
- changePoints: 체중·증상·생활 변화 포인트 배열
- doctorCheckItems: 진료 중 의사가 확인할 항목 배열
- optionCandidates: 의사 검토 후보 배열 (처방 확정 아님)
- chartCopyText: EMR 차트에 붙여넣을 초안 문장

금지:
- 진단, 처방, 용량 변경, 시술, 응급 여부 확정
- "처방하세요", "증량하세요", "반드시 필요합니다", "진단됩니다" 같은 표현

필수 표현:
- "의사 상담 참고용"
- "담당 의사가 최종 판단"

반드시 JSON만 반환하세요.`;

const CARE_AI_SYSTEM_PROMPT_INITIAL = `당신은 비만 초진 문진을 의사 상담 참고용으로 정리하는 보조 도구입니다.

생성 가능:
- patientStatusSummary: 환자 기본 정보·체형 요약 (2~3문장)
- changePoints: 키·체중·BMI 관련 포인트 배열
- doctorCheckItems: 초진 시 의사가 확인할 항목 배열
- optionCandidates: 의사 검토 후보 배열 (처방 확정 아님)
- chartCopyText: EMR 차트에 붙여넣을 초안 문장

금지:
- 진단, 처방, 용량 변경, 시술, 응급 여부 확정
- "처방하세요", "증량하세요", "반드시 필요합니다", "진단됩니다" 같은 표현

필수 표현:
- "의사 상담 참고용"
- "담당 의사가 최종 판단"

반드시 JSON만 반환하세요.`;

function careBuildUserPrompt(submission) {
  if (submission.templateId === "initial") {
    return JSON.stringify(
      {
        task: "care_initial_summary",
        patient: {
          name: submission.name,
          birthDate: submission.birthDate,
          phoneLast4: submission.phoneLast4
        },
        vitals: {
          heightCm: submission.heightCm,
          currentWeightKg: submission.currentWeightKg,
          startWeightKg: submission.startWeightKg
        },
        patientQuestion: submission.patientQuestion || ""
      },
      null,
      2
    );
  }

  return JSON.stringify(
    {
      task: "care_followup_summary",
      patient: {
        name: submission.name,
        birthDate: submission.birthDate,
        phoneLast4: submission.phoneLast4
      },
      weights: {
        currentWeightKg: submission.currentWeightKg,
        startWeightKg: submission.startWeightKg,
        recentWeightChange: submission.recentWeightChange
      },
      medication: {
        currentMedication: submission.currentMedication,
        currentDose: submission.currentDose
      },
      symptomsAndLifestyle: {
        appetite: submission.appetite,
        sideEffects: submission.sideEffects,
        constipation: submission.constipation,
        sleep: submission.sleep,
        exercise: submission.exercise,
        diet: submission.diet
      },
      consultation: {
        consultationGoal: submission.consultationGoal,
        patientQuestion: submission.patientQuestion
      },
      safetyFlags: {
        severeAbdominalPain: submission.severeAbdominalPain,
        persistentVomiting: submission.persistentVomiting,
        dizzinessOrDehydration: submission.dizzinessOrDehydration,
        pregnancyPossibility: submission.pregnancyPossibility
      }
    },
    null,
    2
  );
}

async function careCallOpenAi(env, submission) {
  const apiKey = env.CARE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_KEY_MISSING");
  }

  const model = env.CARE_AI_MODEL || "gpt-4o-mini";
  const systemPrompt =
    submission.templateId === "initial"
      ? CARE_AI_SYSTEM_PROMPT_INITIAL
      : CARE_AI_SYSTEM_PROMPT_FOLLOWUP;
  const schemaName =
    submission.templateId === "initial" ? "care_initial_summary" : "care_followup_summary";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                patientStatusSummary: { type: "string" },
                changePoints: {
                  type: "array",
                  items: { type: "string" }
                },
                doctorCheckItems: {
                  type: "array",
                  items: { type: "string" }
                },
                optionCandidates: {
                  type: "array",
                  items: { type: "string" }
                },
                chartCopyText: { type: "string" }
              },
              required: [
                "patientStatusSummary",
                "changePoints",
                "doctorCheckItems",
                "optionCandidates",
                "chartCopyText"
              ]
            }
          }
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: careBuildUserPrompt(submission) }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI HTTP ${response.status}: ${errorText.slice(0, 300)}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI 응답이 비어 있습니다.");
    }

    return {
      summary: careValidateSummaryOutput(JSON.parse(content)),
      model
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function careCreatePendingSummary(db, clinicId, patientId, submissionId) {
  const now = careNowIso();
  const summaryId = careNewId("careSummary");

  await db
    .prepare(
      `INSERT INTO care_summaries (
         id, clinic_id, patient_id, submission_id, summary_status,
         disclaimer, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'pending', '의사 상담 참고용', ?, ?)`
    )
    .bind(summaryId, clinicId, patientId, submissionId, now, now)
    .run();

  return summaryId;
}

export async function careGenerateAndSaveSummary(db, env, submission) {
  const now = careNowIso();

  try {
    const { summary, model } = await careCallOpenAi(env, submission);

    await db
      .prepare(
        `UPDATE care_summaries SET
           summary_status = 'completed',
           patient_status_summary = ?,
           change_points = ?,
           doctor_check_items = ?,
           option_candidates = ?,
           chart_copy_text = ?,
           disclaimer = ?,
           model = ?,
           error_message = NULL,
           updated_at = ?
         WHERE submission_id = ?`
      )
      .bind(
        summary.patientStatusSummary,
        careStringifyJsonArray(summary.changePoints),
        careStringifyJsonArray(summary.doctorCheckItems),
        careStringifyJsonArray(summary.optionCandidates),
        summary.chartCopyText,
        summary.disclaimer,
        model,
        now,
        submission.id
      )
      .run();

    return { ok: true, summaryStatus: "completed" };
  } catch (error) {
    await db
      .prepare(
        `UPDATE care_summaries SET
           summary_status = 'failed',
           error_message = ?,
           updated_at = ?
         WHERE submission_id = ?`
      )
      .bind(String(error.message || error).slice(0, 500), now, submission.id)
      .run();

    return { ok: false, summaryStatus: "failed", error: String(error.message || error) };
  }
}

export async function careInsertSubmission(db, clinicId, patientId, input, meta = {}) {
  const submissionId = careNewId("careSubmission");
  const now = careNowIso();
  const submittedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  const templateId = meta.templateId || "followup";
  const visitNumber = meta.visitNumber ?? (templateId === "initial" ? 1 : 2);

  await db
    .prepare(
      `INSERT INTO care_submissions (
         id, clinic_id, patient_id, submitted_at, submitted_date, source, status,
         visit_number, template_id,
         name, birth_date, phone_last4, height_cm, current_weight_kg, start_weight_kg,
         current_medication, current_dose, recent_weight_change, appetite,
         side_effects, constipation, sleep, exercise, diet, consultation_goal,
         patient_question, severe_abdominal_pain, persistent_vomiting,
         dizziness_or_dehydration, pregnancy_possibility
       ) VALUES (
         ?, ?, ?, ?, ?, 'qr', 'submitted',
         ?, ?,
         ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?, ?
       )`
    )
    .bind(
      submissionId,
      clinicId,
      patientId,
      now,
      submittedDate,
      visitNumber,
      templateId,
      input.name,
      input.birthDate,
      input.phoneLast4,
      input.heightCm ?? null,
      input.currentWeightKg,
      input.startWeightKg,
      input.currentMedication,
      input.currentDose,
      input.recentWeightChange,
      input.appetite,
      input.sideEffects,
      input.constipation,
      input.sleep,
      input.exercise,
      input.diet,
      input.consultationGoal,
      input.patientQuestion,
      careBoolToInt(input.severeAbdominalPain),
      careBoolToInt(input.persistentVomiting),
      careBoolToInt(input.dizzinessOrDehydration),
      careBoolToInt(input.pregnancyPossibility)
    )
    .run();

  return {
    id: submissionId,
    clinicId,
    patientId,
    submittedAt: now,
    submittedDate,
    source: "qr",
    status: "submitted",
    visitNumber,
    templateId,
    ...input
  };
}

export async function careInsertConsent(db, clinicId, submissionId) {
  await db
    .prepare(
      `INSERT INTO care_consent_logs (
         id, clinic_id, submission_id, consent_type, created_at
       ) VALUES (?, ?, ?, 'care_followup_ai_summary', ?)`
    )
    .bind(careNewId("careConsent"), clinicId, submissionId, careNowIso())
    .run();
}
