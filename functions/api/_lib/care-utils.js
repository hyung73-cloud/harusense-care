const CARE_DISCLAIMER =
  "본 요약은 의사 상담 참고용이며 진단, 처방, 시술 여부를 확정하지 않습니다.";

const CARE_FORBIDDEN_PHRASES = [
  "처방하세요",
  "증량하세요",
  "반드시 필요합니다",
  "진단됩니다",
  "시술이 필요합니다",
  "응급입니다",
  "확정합니다"
];

export function careJson(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}

export function careError(message, status = 400) {
  return careJson({ ok: false, error: message }, status);
}

export function careNowIso() {
  return new Date().toISOString();
}

export function careTodayKst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function careNewId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function careParseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

export function careStringifyJsonArray(value) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

export function careSanitizeText(value, maxLength = 2000) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function careBoolToInt(value) {
  return value ? 1 : 0;
}

export function careIntToBool(value) {
  return value === 1 || value === true;
}

export function careBuildTags(submission) {
  const tags = [];
  if (submission.templateId === "initial") {
    tags.push("초진");
    return tags;
  }
  if (submission.visitNumber && submission.visitNumber > 2) {
    tags.push(`${submission.visitNumber}회차`);
  }
  if (submission.constipation && submission.constipation !== "없음") tags.push("변비");
  if (submission.sideEffects) tags.push("부작용");
  if (submission.recentWeightChange === "정체") tags.push("체중정체");
  if (submission.recentWeightChange === "증가") tags.push("체중증가");
  if (
    submission.severeAbdominalPain ||
    submission.persistentVomiting ||
    submission.dizzinessOrDehydration ||
    submission.pregnancyPossibility
  ) {
    tags.push("안전확인");
  }
  return tags;
}

export function careValidateSummaryOutput(summary) {
  const fields = [
    "patientStatusSummary",
    "changePoints",
    "doctorCheckItems",
    "optionCandidates",
    "chartCopyText"
  ];

  for (const field of fields) {
    if (!summary[field]) {
      throw new Error(`AI 요약 필드 누락: ${field}`);
    }
  }

  if (!Array.isArray(summary.changePoints) || summary.changePoints.length === 0) {
    throw new Error("changePoints 형식 오류");
  }

  const combined = [
    summary.patientStatusSummary,
    ...summary.changePoints,
    ...summary.doctorCheckItems,
    ...summary.optionCandidates,
    summary.chartCopyText
  ].join(" ");

  for (const phrase of CARE_FORBIDDEN_PHRASES) {
    if (combined.includes(phrase)) {
      throw new Error(`금지 표현 포함: ${phrase}`);
    }
  }

  return {
    patientStatusSummary: careSanitizeText(summary.patientStatusSummary, 1000),
    changePoints: summary.changePoints.map((item) => careSanitizeText(item, 500)),
    doctorCheckItems: summary.doctorCheckItems.map((item) => careSanitizeText(item, 500)),
    optionCandidates: summary.optionCandidates.map((item) => careSanitizeText(item, 500)),
    chartCopyText: careSanitizeText(summary.chartCopyText, 3000),
    disclaimer: CARE_DISCLAIMER
  };
}

export function careRowToSubmission(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    submittedAt: row.submitted_at,
    submittedDate: row.submitted_date,
    source: row.source,
    status: row.status,
    visitNumber: row.visit_number ?? null,
    templateId: row.template_id || "followup",
    name: row.name,
    birthDate: row.birth_date || "",
    phoneLast4: row.phone_last4 || "",
    heightCm: row.height_cm ?? null,
    currentWeightKg: row.current_weight_kg,
    startWeightKg: row.start_weight_kg,
    currentMedication: row.current_medication || "",
    currentDose: row.current_dose || "",
    recentWeightChange: row.recent_weight_change || "",
    appetite: row.appetite || "",
    sideEffects: row.side_effects || "",
    constipation: row.constipation || "",
    sleep: row.sleep || "",
    exercise: row.exercise || "",
    diet: row.diet || "",
    consultationGoal: row.consultation_goal || "",
    patientQuestion: row.patient_question || "",
    severeAbdominalPain: careIntToBool(row.severe_abdominal_pain),
    persistentVomiting: careIntToBool(row.persistent_vomiting),
    dizzinessOrDehydration: careIntToBool(row.dizziness_or_dehydration),
    pregnancyPossibility: careIntToBool(row.pregnancy_possibility)
  };
}

export function careRowToSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    submissionId: row.submission_id,
    summaryStatus: row.summary_status,
    patientStatusSummary: row.patient_status_summary || "",
    changePoints: careParseJsonArray(row.change_points),
    doctorCheckItems: careParseJsonArray(row.doctor_check_items),
    optionCandidates: careParseJsonArray(row.option_candidates),
    chartCopyText: row.chart_copy_text || "",
    disclaimer: row.disclaimer || CARE_DISCLAIMER,
    model: row.model || "",
    errorMessage: row.error_message || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function careGetClientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

export async function careCheckRateLimit(db, scopeKey, limit, windowMinutes = 1) {
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - (now.getTime() % (windowMinutes * 60 * 1000))
  ).toISOString();
  const id = careNewId("careRate");

  await db
    .prepare(
      `INSERT INTO care_rate_limits (id, scope_key, window_start, hit_count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(scope_key, window_start)
       DO UPDATE SET hit_count = hit_count + 1`
    )
    .bind(id, scopeKey, windowStart)
    .run();

  const row = await db
    .prepare(
      `SELECT hit_count FROM care_rate_limits
       WHERE scope_key = ? AND window_start = ?`
    )
    .bind(scopeKey, windowStart)
    .first();

  if (row && row.hit_count > limit) {
    throw new Error("RATE_LIMIT");
  }
}

export function careValidateSubmissionInput(body) {
  const name = careSanitizeText(body.name, 80);
  const birthDate = careSanitizeText(body.birthDate, 20);
  const phoneLast4 = careSanitizeText(body.phoneLast4, 4);

  if (!name) {
    throw new Error("이름을 입력해주세요.");
  }

  if (!birthDate && !phoneLast4) {
    throw new Error("생년월일 또는 연락처 뒷자리 중 하나는 필요합니다.");
  }

  if (phoneLast4 && !/^\d{4}$/.test(phoneLast4)) {
    throw new Error("연락처 뒷자리는 4자리 숫자여야 합니다.");
  }

  const requiredSelects = [
    "currentMedication",
    "recentWeightChange",
    "appetite",
    "constipation",
    "sleep",
    "exercise",
    "consultationGoal"
  ];

  for (const field of requiredSelects) {
    if (!careSanitizeText(body[field], 200)) {
      throw new Error("필수 항목을 모두 입력해주세요.");
    }
  }

  const currentWeight = Number(body.currentWeightKg);
  if (!currentWeight || currentWeight < 20 || currentWeight > 250) {
    throw new Error("현재 체중을 확인해주세요.");
  }

  const startWeight = body.startWeightKg ? Number(body.startWeightKg) : null;
  if (startWeight !== null && (startWeight < 20 || startWeight > 250)) {
    throw new Error("시작 체중을 확인해주세요.");
  }

  if (!body.consent) {
    throw new Error("문진 저장 동의가 필요합니다.");
  }

  return {
    name,
    birthDate: birthDate || null,
    phoneLast4: phoneLast4 || null,
    currentWeightKg: currentWeight,
    startWeightKg: startWeight,
    currentMedication: careSanitizeText(body.currentMedication, 100),
    currentDose: careSanitizeText(body.currentDose, 100),
    recentWeightChange: careSanitizeText(body.recentWeightChange, 100),
    appetite: careSanitizeText(body.appetite, 100),
    sideEffects: careSanitizeText(body.sideEffects, 1000),
    constipation: careSanitizeText(body.constipation, 100),
    sleep: careSanitizeText(body.sleep, 100),
    exercise: careSanitizeText(body.exercise, 100),
    diet: careSanitizeText(body.diet, 1000),
    consultationGoal: careSanitizeText(body.consultationGoal, 200),
    patientQuestion: careSanitizeText(body.patientQuestion, 1000),
    severeAbdominalPain: Boolean(body.severeAbdominalPain),
    persistentVomiting: Boolean(body.persistentVomiting),
    dizzinessOrDehydration: Boolean(body.dizzinessOrDehydration),
    pregnancyPossibility: Boolean(body.pregnancyPossibility)
  };
}
