# care 배포 가이드 (care.harusense.com)

## 1. Cloudflare D1 생성

```bash
npx wrangler d1 create care-db
```

출력된 `database_id`를 `wrangler.toml`에 넣습니다.

```bash
npx wrangler d1 migrations apply care-db --remote
```

로컬 개발용:

```bash
npx wrangler d1 migrations apply care-db --local
npx wrangler pages dev . --local
```

## 2. Secrets 설정

Cloudflare Dashboard → Pages → harusense-care → Settings → Environment variables

| 이름 | 타입 | 설명 |
|------|------|------|
| `CARE_SESSION_SECRET` | Secret | 32자 이상 랜덤 문자열 |
| `CARE_OPENAI_API_KEY` | Secret | OpenAI API 키 |

`CARE_AI_MODEL`, `CARE_PASSWORD_SALT`는 `wrangler.toml` [vars]에 있습니다.

## 3. Pages 프로젝트 생성

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
2. 이 저장소(`harusense-care`) 연결
3. Build settings:
   - **Build command**: (비움)
   - **Build output directory**: `/`
4. Settings → Functions → D1 bindings:
   - Variable name: `CARE_DB`
   - D1 database: `care-db`

## 4. 커스텀 도메인

Pages 프로젝트 → Custom domains → `care.harusense.com` 추가

DNS (Cloudflare):

```
care  CNAME  <pages-subdomain>.pages.dev
```

## 5. QR 코드

환자용 URL:

```
https://care.harusense.com/?clinic=newsense
```

## 6. 비밀번호 변경

초기 시드 비밀번호 `care-demo`는 배포 후 즉시 변경하세요.

```bash
node scripts/care-hash-password.js "새비밀번호"
```

출력된 hash를 D1에서 업데이트:

```sql
UPDATE care_staff_users
SET password_hash = '<hash>'
WHERE clinic_id = 'newsense' AND login_id = 'newsense';
```

## 7. 로컬 개발

```bash
npx wrangler pages dev . --d1 CARE_DB=care-db --local
```

로컬에서 OpenAI 테스트:

```bash
# .dev.vars 파일 생성
CARE_SESSION_SECRET=local-dev-secret-32chars-minimum
CARE_OPENAI_API_KEY=sk-...
```

```bash
npx wrangler pages dev . --d1 CARE_DB=care-db --local --env-file=.dev.vars
```

## 8. 1개월 운영 체크리스트

- [ ] D1 백업 정책 확인 (Cloudflare D1 export 주 1회 권장)
- [ ] OpenAI 사용량/비용 모니터링 (600건/월 ≈ 저비용)
- [ ] 초기 비밀번호 변경 완료
- [ ] `care_audit_logs` 주기적 확인
- [ ] AI 요약 실패(`summary_status=failed`) 건 대시보드에서 재생성 테스트

## 9. harusense.com 메인과의 관계

- **별도 Pages 프로젝트**로 배포 (권장)
- 메인 `harusense.com` repo/index.html **수정 불필요**
- DB, API, 인증 **완전 분리**

## 10. 트러블슈팅

| 증상 | 확인 |
|------|------|
| 500 care DB 미설정 | Pages D1 binding `CARE_DB` 확인 |
| AI 요약 failed | `CARE_OPENAI_API_KEY` secret 확인 |
| 로그인 안 됨 | D1 seed 적용 여부, salt 일치 확인 |
| 오늘 목록 0명 | KST 기준 `submitted_date` — 서버 시간대 Asia/Seoul 사용 |
