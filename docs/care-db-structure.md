# care DB structure

모든 컬렉션은 기존 지도/가격 데이터와 분리하며 `care` prefix를 사용합니다.

## careClinics

```json
{
  "id": "newsense",
  "clinicId": "newsense",
  "name": "뉴센스의원",
  "status": "active",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## careStaffUsers

```json
{
  "id": "auto-id",
  "clinicId": "newsense",
  "loginId": "newsense",
  "role": "doctor",
  "status": "active",
  "createdAt": "timestamp",
  "lastLoginAt": "timestamp"
}
```

## carePatients

```json
{
  "id": "auto-id",
  "clinicId": "newsense",
  "name": "홍길동",
  "birthDate": "1990-01-01",
  "phoneLast4": "1234",
  "patientKey": "clinic-scoped-normalized-or-hashed-key",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "lastSubmissionAt": "timestamp"
}
```

## careSubmissions

```json
{
  "id": "auto-id",
  "clinicId": "newsense",
  "patientId": "carePatient-id",
  "submittedAt": "timestamp",
  "submittedDate": "YYYY-MM-DD",
  "source": "qr",
  "status": "submitted",
  "name": "홍길동",
  "birthDate": "1990-01-01",
  "phoneLast4": "1234",
  "currentWeightKg": 72.4,
  "startWeightKg": 80.0,
  "currentMedication": "위고비",
  "currentDose": "1.0mg",
  "recentWeightChange": "정체",
  "appetite": "조금 줄어듦",
  "sideEffects": "메스꺼움",
  "constipation": "가끔 있음",
  "sleep": "보통",
  "exercise": "주 1~2회",
  "diet": "저녁 식사량 감소",
  "consultationGoal": "용량 변경 상담",
  "patientQuestion": "증량 가능 여부 상담 희망",
  "severeAbdominalPain": false,
  "persistentVomiting": false,
  "dizzinessOrDehydration": false,
  "pregnancyPossibility": false
}
```

## careSummaries

```json
{
  "id": "auto-id",
  "clinicId": "newsense",
  "patientId": "carePatient-id",
  "submissionId": "careSubmission-id",
  "summaryStatus": "completed",
  "patientStatusSummary": "환자 상태 요약",
  "changePoints": ["변화 포인트"],
  "doctorCheckItems": ["의사 확인 필요사항"],
  "optionCandidates": ["의사 검토 후보"],
  "chartCopyText": "차트 복사용 문장",
  "disclaimer": "의사 상담 참고용",
  "model": "model-name",
  "createdAt": "timestamp"
}
```

## careDoctorNotes

```json
{
  "id": "auto-id",
  "clinicId": "newsense",
  "patientId": "carePatient-id",
  "submissionId": "careSubmission-id",
  "staffUserId": "careStaffUser-id",
  "doctorDecision": "의사 최종 판단",
  "chartTextFinal": "EMR에 남긴 최종 문장",
  "createdAt": "timestamp"
}
```

## careKnowledgeRules

```json
{
  "id": "auto-id",
  "clinicId": "newsense",
  "ruleType": "obesity_followup",
  "trigger": ["변비", "식욕저하", "체중정체"],
  "doctorCheckItems": ["변비 기간 확인"],
  "optionCandidates": ["의사 판단하 처치 또는 상담 검토"],
  "safetyLevel": "doctor_only",
  "status": "active",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## careAuditLogs

```json
{
  "id": "auto-id",
  "clinicId": "newsense",
  "staffUserId": "careStaffUser-id",
  "action": "view_submission",
  "targetType": "careSubmission",
  "targetId": "careSubmission-id",
  "createdAt": "timestamp"
}
```

## careConsentLogs

```json
{
  "id": "auto-id",
  "clinicId": "newsense",
  "submissionId": "careSubmission-id",
  "consentType": "care_followup_ai_summary",
  "createdAt": "timestamp"
}
```
