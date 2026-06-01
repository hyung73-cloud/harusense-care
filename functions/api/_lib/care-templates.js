import { careSanitizeText } from "./care-utils.js";

export const CARE_TEMPLATE_DEFAULTS = {
  initial: {
    id: "initial",
    visitNumber: 1,
    title: "초진 문진",
    description: "키, 몸무게 등 최소 항목만 입력해주세요.",
    sections: ["patient", "vitals", "consent"]
  },
  followup: {
    id: "followup",
    visitNumber: 2,
    title: "재진 전 문진",
    description: "진료 전 현재 상태를 간단히 알려주세요. 입력 내용은 담당 의사가 상담 전 확인합니다.",
    sections: ["patient", "medication", "symptoms", "safety", "consultation", "consent"]
  }
};

export function careResolveTemplateParams({ templateId, visitNumber }) {
  const template = careSanitizeText(templateId, 40);
  const visit = Number(visitNumber);

  if (template && CARE_TEMPLATE_DEFAULTS[template]) {
    return {
      templateId: template,
      visitNumber: CARE_TEMPLATE_DEFAULTS[template].visitNumber
    };
  }

  if (visit === 1) {
    return { templateId: "initial", visitNumber: 1 };
  }

  if (visit >= 2) {
    return { templateId: "followup", visitNumber: visit };
  }

  return { templateId: "followup", visitNumber: 2 };
}

export async function careGetTemplate(db, clinicId, templateId) {
  const row = await db
    .prepare(
      `SELECT id, visit_number, title, description, field_config, status
       FROM care_survey_templates
       WHERE clinic_id = ? AND id = ? AND status = 'active'`
    )
    .bind(clinicId, templateId)
    .first();

  const fallback = CARE_TEMPLATE_DEFAULTS[templateId] || CARE_TEMPLATE_DEFAULTS.followup;

  if (!row) {
    return {
      id: fallback.id,
      visitNumber: fallback.visitNumber,
      title: fallback.title,
      description: fallback.description,
      sections: fallback.sections
    };
  }

  let fieldConfig = {};
  try {
    fieldConfig = JSON.parse(row.field_config || "{}");
  } catch (_error) {
    fieldConfig = {};
  }

  return {
    id: row.id,
    visitNumber: row.visit_number,
    title: row.title,
    description: row.description || fallback.description,
    sections: fieldConfig.sections || fallback.sections
  };
}

export function careValidateSubmissionForTemplate(body, templateId) {
  if (templateId === "initial") {
    return careValidateInitialInput(body);
  }
  return null;
}

function careValidateInitialInput(body) {
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

  const currentWeight = Number(body.currentWeightKg);
  if (!currentWeight || currentWeight < 20 || currentWeight > 250) {
    throw new Error("현재 체중을 확인해주세요.");
  }

  const heightCm = Number(body.heightCm);
  if (!heightCm || heightCm < 100 || heightCm > 250) {
    throw new Error("키를 확인해주세요.");
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
    heightCm,
    currentWeightKg: currentWeight,
    startWeightKg: startWeight,
    currentMedication: null,
    currentDose: null,
    recentWeightChange: null,
    appetite: null,
    sideEffects: null,
    constipation: null,
    sleep: null,
    exercise: null,
    diet: null,
    consultationGoal: null,
    patientQuestion: careSanitizeText(body.patientQuestion, 1000) || null,
    severeAbdominalPain: false,
    persistentVomiting: false,
    dizzinessOrDehydration: false,
    pregnancyPossibility: false
  };
}
