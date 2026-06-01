-- 초기 클리닉: newsense (뉴센스의원)
-- 초기 로그인: newsense / care-demo (배포 후 즉시 변경 권장)

INSERT OR IGNORE INTO care_clinics (id, name, status, created_at, updated_at)
VALUES (
  'newsense',
  '뉴센스의원',
  'active',
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO care_staff_users (
  id, clinic_id, login_id, password_hash, role, status, created_at
)
VALUES (
  'careStaff_newsense_001',
  'newsense',
  'newsense',
  '0159963509370eb9ebd78d7df2894541ac3ce9574556718ece82bac8eef359a7',
  'doctor',
  'active',
  datetime('now')
);
