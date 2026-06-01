# care (care.harusense.com)

뉴센스의원 비만 재진 follow-up 문진/AI 요약 MVP입니다.

**가격지도(harusense.com), 지도 DB, 병원/약국 지도 기능과 완전히 분리**된 독립 Cloudflare Pages 프로젝트입니다.

## URL

| 경로 | 설명 |
|------|------|
| `https://care.harusense.com/?clinic=newsense` | 환자 QR 문진 |
| `https://care.harusense.com/login/` | 의료진 로그인 |
| `https://care.harusense.com/dashboard/` | 오늘 제출 + AI 요약 |

## 운영 가정 (1개월 안정성 테스트)

- 1개 의료기관 (`newsense`)
- 하루 약 20명 × 30일 ≈ 600건 제출
- OpenAI `gpt-4o-mini`로 제출 시 AI 요약 생성
- 별도 D1 DB `care-db` (가격지도 `harusense-db`와 분리)

## 기술 스택

- Cloudflare Pages (정적 HTML + Functions)
- Cloudflare D1 (`CARE_DB`)
- OpenAI API (서버 전용)
- HttpOnly 세션 쿠키 (HMAC 서명)

## 프로젝트 구조

```
├── index.html                 # 환자 문진
├── login/index.html           # 의료진 로그인
├── dashboard/index.html       # 대시보드
├── assets/                    # CSS/JS
├── functions/api/             # API (submit, login, dashboard 등)
├── care-schema.sql            # D1 스키마
├── care-seed.sql              # newsense 초기 데이터
└── wrangler.toml
```

## API

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/template` | 없음 | 문진 템플릿 조회 (`?clinic=&visit=&template=`) |
| POST | `/api/submit` | 없음 | 환자 문진 제출 + AI 요약 |
| POST | `/api/login` | 없음 | 의료진 로그인 |
| POST | `/api/logout` | 세션 | 로그아웃 |
| GET | `/api/dashboard` | 세션 | 오늘 제출 목록 |
| GET | `/api/submission?id=` | 세션 | 제출 상세 + 요약 |
| POST | `/api/summarize` | 세션 | AI 요약 재생성 |
| POST | `/api/audit` | 세션 | 감사 로그 |

## 배포

자세한 절차는 [docs/care-deploy.md](docs/care-deploy.md) 참고.

```bash
# 1) D1 생성 및 마이그레이션 적용
npx wrangler d1 create care-db
npx wrangler d1 migrations apply care-db --remote

# 2) wrangler.toml의 database_id 업데이트

# 3) Secrets 설정 (Cloudflare Dashboard)
# CARE_SESSION_SECRET
# CARE_OPENAI_API_KEY

# 4) Pages 프로젝트 배포 + care.harusense.com 커스텀 도메인 연결
```

## 초기 로그인 (시드)

- 아이디: `newsense`
- 비밀번호: `care-demo`

**배포 직후 비밀번호를 변경하세요.**

## AI 정책

- AI는 **의사 상담 참고용** 요약만 생성
- 진단/처방/증량/시술 확정 금지
- 상세: [docs/care-ai-policy.md](docs/care-ai-policy.md)

## 보안

- 환자: 제출만 가능, 목록/조회 불가
- 의료진: 자기 `clinicId` 데이터만 접근
- rate limit: submit IP당 분당 8회
- 상세: [docs/care-security-policy.md](docs/care-security-policy.md)
