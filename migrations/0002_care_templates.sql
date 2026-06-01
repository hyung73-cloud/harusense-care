-- 회차·템플릿 기반 문진 (로드맵 1단계)

CREATE TABLE IF NOT EXISTS care_survey_templates (
  id            TEXT PRIMARY KEY,
  clinic_id     TEXT NOT NULL REFERENCES care_clinics(id),
  visit_number  INTEGER NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  field_config  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  UNIQUE(clinic_id, id)
);

CREATE INDEX IF NOT EXISTS idx_care_survey_templates_clinic
  ON care_survey_templates(clinic_id, visit_number);

ALTER TABLE care_submissions ADD COLUMN visit_number INTEGER;
ALTER TABLE care_submissions ADD COLUMN template_id TEXT;
ALTER TABLE care_submissions ADD COLUMN height_cm REAL;

-- newsense 기본 템플릿 시드
INSERT OR IGNORE INTO care_survey_templates (
  id, clinic_id, visit_number, title, description, field_config, status, created_at, updated_at
) VALUES (
  'initial',
  'newsense',
  1,
  '초진 문진',
  '키, 몸무게 등 최소 항목만 수집합니다.',
  '{"sections":["patient","vitals"],"required":["name","currentWeightKg","heightCm"]}',
  'active',
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO care_survey_templates (
  id, clinic_id, visit_number, title, description, field_config, status, created_at, updated_at
) VALUES (
  'followup',
  'newsense',
  2,
  '재진 문진',
  '비만 재진 follow-up 전체 문진입니다.',
  '{"sections":["patient","medication","symptoms","safety","consultation"],"required":["name","currentWeightKg","currentMedication","recentWeightChange","appetite","constipation","sleep","exercise","consultationGoal"]}',
  'active',
  datetime('now'),
  datetime('now')
);
