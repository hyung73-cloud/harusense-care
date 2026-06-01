-- care 전용 D1 스키마 (가격지도 DB와 완전 분리)

CREATE TABLE IF NOT EXISTS care_clinics (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS care_staff_users (
  id              TEXT PRIMARY KEY,
  clinic_id       TEXT NOT NULL REFERENCES care_clinics(id),
  login_id        TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'doctor',
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL,
  last_login_at   TEXT,
  UNIQUE(clinic_id, login_id)
);

CREATE TABLE IF NOT EXISTS care_patients (
  id                  TEXT PRIMARY KEY,
  clinic_id           TEXT NOT NULL REFERENCES care_clinics(id),
  name                TEXT NOT NULL,
  birth_date          TEXT,
  phone_last4         TEXT,
  patient_key         TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  last_submission_at  TEXT,
  UNIQUE(clinic_id, patient_key)
);

CREATE INDEX IF NOT EXISTS idx_care_patients_clinic
  ON care_patients(clinic_id);

CREATE TABLE IF NOT EXISTS care_submissions (
  id                        TEXT PRIMARY KEY,
  clinic_id                 TEXT NOT NULL,
  patient_id                TEXT NOT NULL REFERENCES care_patients(id),
  submitted_at              TEXT NOT NULL,
  submitted_date            TEXT NOT NULL,
  source                    TEXT NOT NULL DEFAULT 'qr',
  status                    TEXT NOT NULL DEFAULT 'submitted',
  visit_number              INTEGER,
  template_id               TEXT,
  name                      TEXT NOT NULL,
  birth_date                TEXT,
  phone_last4               TEXT,
  height_cm                 REAL,
  current_weight_kg         REAL,
  start_weight_kg           REAL,
  current_medication        TEXT,
  current_dose              TEXT,
  recent_weight_change      TEXT,
  appetite                  TEXT,
  side_effects              TEXT,
  constipation              TEXT,
  sleep                     TEXT,
  exercise                  TEXT,
  diet                      TEXT,
  consultation_goal         TEXT,
  patient_question          TEXT,
  severe_abdominal_pain     INTEGER NOT NULL DEFAULT 0,
  persistent_vomiting       INTEGER NOT NULL DEFAULT 0,
  dizziness_or_dehydration  INTEGER NOT NULL DEFAULT 0,
  pregnancy_possibility     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_care_submissions_clinic_date
  ON care_submissions(clinic_id, submitted_date);

CREATE INDEX IF NOT EXISTS idx_care_submissions_patient
  ON care_submissions(patient_id);

CREATE TABLE IF NOT EXISTS care_summaries (
  id                      TEXT PRIMARY KEY,
  clinic_id               TEXT NOT NULL,
  patient_id              TEXT NOT NULL,
  submission_id           TEXT NOT NULL UNIQUE REFERENCES care_submissions(id),
  summary_status          TEXT NOT NULL DEFAULT 'pending',
  patient_status_summary  TEXT,
  change_points           TEXT,
  doctor_check_items      TEXT,
  option_candidates       TEXT,
  chart_copy_text         TEXT,
  disclaimer              TEXT NOT NULL DEFAULT '의사 상담 참고용',
  model                   TEXT,
  error_message           TEXT,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_care_summaries_clinic
  ON care_summaries(clinic_id);

CREATE TABLE IF NOT EXISTS care_audit_logs (
  id            TEXT PRIMARY KEY,
  clinic_id     TEXT NOT NULL,
  staff_user_id TEXT,
  action        TEXT NOT NULL,
  target_type   TEXT,
  target_id     TEXT,
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_care_audit_clinic_date
  ON care_audit_logs(clinic_id, created_at);

CREATE TABLE IF NOT EXISTS care_consent_logs (
  id              TEXT PRIMARY KEY,
  clinic_id       TEXT NOT NULL,
  submission_id   TEXT NOT NULL,
  consent_type    TEXT NOT NULL DEFAULT 'care_followup_ai_summary',
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS care_rate_limits (
  id           TEXT PRIMARY KEY,
  scope_key    TEXT NOT NULL,
  window_start TEXT NOT NULL,
  hit_count    INTEGER NOT NULL DEFAULT 1,
  UNIQUE(scope_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_care_rate_limits_scope
  ON care_rate_limits(scope_key, window_start);

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
