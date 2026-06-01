# care MVP 인수인계 (2026-05-31)

사무실에서 Cursor로 이어갈 때 이 파일을 먼저 읽거나, 새 채팅에 아래 **한 줄 요청**을 붙여넣으세요.

```
docs/HANDOFF.md 읽고 care.harusense.com 작업 이어서 해줘.
```

---

## 한 줄 요약

**harusense.com 가격지도와 완전 분리**된 `care.harusense.com` — 환자 QR 문진 → D1 저장 → OpenAI 의사 참고용 요약 → 의사 대시보드. **2026-05-31 배포·동작 확인 완료.**

---

## URL

| 용도 | URL |
|------|-----|
| 환자 QR/문진 (재진) | https://care.harusense.com/?clinic=newsense |
| 환자 QR/문진 (초진) | https://care.harusense.com/?clinic=newsense&visit=1 |
| 환자 QR/문진 (N회차) | https://care.harusense.com/?clinic=newsense&visit=2&template=followup |
| 의료진 로그인 | https://care.harusense.com/login/ |
| 대시보드 | https://care.harusense.com/dashboard/ |
| Pages 기본 | https://harusense-care.pages.dev |

---

## 계정·키 (배포 후 비밀번호 변경 권장)

| 항목 | 값 |
|------|-----|
| 의료진 로그인 ID | `newsense` |
| 초기 비밀번호 | `care-demo` |
| clinicId | `newsense` |

비밀번호 변경:

```powershell
cd harusense-care
node scripts/care-hash-password.js "새비밀번호"
```

→ D1 Console에서 `care_staff_users.password_hash` UPDATE

---

## 인프라 (Cloudflare)

| 리소스 | 이름 | 비고 |
|--------|------|------|
| Pages 프로젝트 | `harusense-care` | harusense-cloudflare와 **별도** |
| GitHub repo | `hyung73-cloud/harusense-care` | |
| D1 DB | `care-db` | **harusense-db와 분리** |
| D1 Database ID | `a5ae2c05-49f3-4f65-b39a-20a4060e059c` | |
| 커스텀 도메인 | `care.harusense.com` | 연결 완료 |

### Pages 바인딩·Secrets

- **D1 binding:** `CARE_DB` → `care-db`
- **Secrets:** `CARE_SESSION_SECRET`, `CARE_OPENAI_API_KEY`
- **Plaintext vars:** `CARE_AI_MODEL` (gpt-4o-mini), `CARE_PASSWORD_SALT` (newsense-care-salt-v1)

Secret/변수 변경 후 → **Deployments → Retry deployment** 또는 `git commit --allow-empty -m "redeploy" && git push`

---

## 로컬 코드

| 경로 | 설명 |
|------|------|
| PC (오늘 작업) | `C:\Users\user\Documents\Codex\2026-05-31\harusense-com-care-care-ai-follow` |
| 사무실 | `git clone https://github.com/hyung73-cloud/harusense-care.git` |

### 주요 파일

```
index.html              # 환자 문진
login/index.html        # 의료진 로그인
dashboard/index.html    # 오늘 제출 + AI 요약
functions/api/          # submit, login, dashboard, submission, summarize
migrations/0001_care_init.sql
wrangler.toml
docs/care-deploy.md
docs/care-db-structure.md
docs/care-ai-policy.md
docs/care-security-policy.md
```

---

## DB 테이블 (care-db, care_ prefix)

- `care_clinics`, `care_staff_users`, `care_patients`
- `care_submissions`, `care_summaries`
- `care_audit_logs`, `care_consent_logs`, `care_rate_limits`

마이그레이션:

```bash
npx wrangler d1 migrations apply care-db --remote
```

---

## 2026-05-31 확인된 동작

- [x] GitHub push
- [x] D1 migration
- [x] Pages 배포
- [x] care.harusense.com 도메인
- [x] 의료진 로그인
- [x] 환자 문진 제출 → 대시보드 표시
- [x] OpenAI AI 요약 (gpt-4o-mini, 크레딧 $5 충전)

---

## 트러블슈팅

| 증상 | 확인 |
|------|------|
| `care 서버 설정이 완료되지 않았습니다` | Production Variables + D1 binding + redeploy |
| AI `401 invalid_api_key` | `CARE_OPENAI_API_KEY`에 `sk-...` 키인지 확인 |
| AI 요약 failed | 대시보드 **AI 요약 다시 생성** / OpenAI 크레딧 |
| 오늘 목록 0명 | KST 기준 당일 제출만 표시, F5 새로고침 |

---

## 향후 로드맵 (의사님 설명, 미구현)

현재 MVP = **follow-up 1종 설문** (2차 이후 재진용으로 사용 중).

| 회차 | 방향 |
|------|------|
| **1차 초진** | 극간단 — 키, 몸무게 등 최소 |
| **2차~** | 의사가 설정한 **알고리즘별** 짧은 설문 |
| **3차~** | 다음 진료용 설문 **미리 저장** |
| **최소 7종** | 회차마다 수집 항목을 조금씩 다르게 |

구현 시 추가 예정:

- `visitNumber` / `templateId` / `careSurveyTemplates` (또는 `careAlgorithms`)
- QR: `?clinic=newsense&visit=2&template=xxx`
- 의사 설정 UI (다음 진료 설문 선택)

**원칙 유지:** harusense.com 가격지도·harusense-db **절대 수정 금지**, `care` prefix, 별도 DB.

---

## 2026-06-01 작업 (회차·템플릿 1단계)

- [x] `care_survey_templates` 테이블 + `visit_number` / `template_id` / `height_cm` 컬럼 추가 (migration `0002`)
- [x] `GET /api/template` — URL `visit` / `template` 파라미터로 문진 폼 결정
- [x] 초진(`visit=1`, template `initial`) — 키·체중 최소 문진
- [x] 재진(`visit=2+`, template `followup`) — 기존 follow-up 문진 (기본값, 하위 호환)
- [x] 대시보드 — 회차 라벨(초진/N회차) 표시, 초진/재진 QR 링크
- [x] AI 요약 — 초진/재진 프롬프트 분리

### 배포 필요 (아직 미적용)

```bash
npx wrangler d1 migrations apply care-db --remote
git add -A && git commit -m "feat: visit/template survey foundation" && git push
```

---

## 내일 할 일 (2026-06-02)

### 우선순위 1 — 배포·검증

- [ ] D1 migration `0002_care_templates.sql` 원격 적용
- [ ] GitHub push → Pages 자동 배포 확인
- [ ] 초진 QR (`?visit=1`) 제출 → 대시보드 표시·AI 요약 테스트
- [ ] 재진 QR (`?visit=2`) 기존 동작 회귀 테스트
- [ ] 의료진 비밀번호 `care-demo` → 운영용으로 변경

### 우선순위 2 — 3~7회차 템플릿 확장

- [ ] `care_survey_templates`에 3~7회차 시드 추가 (회차별 수집 항목 차등)
- [ ] 알고리즘별 템플릿 ID 설계 (`template=obesity_wegovy` 등)
- [ ] 환자 폼 — 회차별 필드 미세 조정 (JS section config)

### 우선순위 3 — 의사 설정 UI

- [ ] 대시보드에 "다음 진료 설문 설정" 패널 (환자별 또는 기본값)
- [ ] `POST /api/template-config` — 의사가 다음 visit template 지정
- [ ] QR 생성기 — clinic + visit + template URL 복사

### 기타

- [ ] 사무실 PC Git 설치 (`git-scm.com`) 후 정식 clone
- [ ] OpenAI 크레딧 잔액 주기 확인

---

## 재배포 (빈 커밋)

```powershell
git commit --allow-empty -m "redeploy"
git push
```

---

## 관련 문서

- [care-deploy.md](./care-deploy.md) — 배포 절차
- [care-db-structure.md](./care-db-structure.md) — DB 설계
- [care-ai-policy.md](./care-ai-policy.md) — AI 정책
- [care-security-policy.md](./care-security-policy.md) — 보안
