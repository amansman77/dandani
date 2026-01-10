# Plan-0001: Remove Schedule-Based (“일정형”) Challenges
작성일: 2026-01-10  
**상태**: ✅ 완료 (2026-01-10)

## 목표
- 챌린지를 “선택형 + startedAt” 단일 모델로 단순화하고, `start_date/end_date` 기반 일정형 로직/데이터 흐름을 제거한다.

## 범위
- 백엔드(Workers) API, 프런트 유틸/화면, 데이터/스키마/문서, 분석/테스트.

## 단계별 계획
1) **사용처 인벤토리**
   - `start_date`, `end_date`, 일정 기반 일차 계산/필터 사용처를 프런트(`frontend/src`)·백엔드(`workers/src/index.js`)·문서에서 전수 조사.
   - 관련 API 응답 필드, DB 스키마 컬럼, UI 표시 요소를 목록화.

2) **단일 모델 정의**
   - ADR-0003에 정의된 챌린지 모델 통일 원칙 적용
   - 상태/진행률: ADR-0002 규칙을 일정형 제거 후에도 유지(일차=startedAt 기준).

3) **백엔드 정리**
   - `/api/practice/today`, `/api/challenges`, `/api/challenges/:id`에서 `start_date/end_date` 기반 분기 제거, `startedAt` 기반으로 통일.
   - 기록 조회/집계(`feedback/record`, `feedback/history`)도 `X-Started-At` 없으면 에러 또는 기본 startedAt 생성 규칙 결정.
   - DB 스키마: `challenges`의 `start_date/end_date` 사용 제거 검토(즉시 드롭 또는 deprecated 표시 후 후속 마이그레이션).

4) **프런트 정리**
   - `utils/challengeDay.js` 등에서 일정형 분기 제거, `calculateChallengeDay` 입력을 startedAt 기반으로 단순화.
   - 선택 플로우 강제: 챌린지 미선택 시 셀렉터만 노출, 선택 시 `startedAt` 저장/헤더 전송.
   - UI에서 start/end date 노출 제거 및 진행률 계산을 기록 기반/현재 일차 기반으로만 표시.

5) **데이터/마이그레이션**
   - 기존 사용자/기록이 일정형 기준으로 생성된 경우 처리 방침 수립: 기본 startedAt 백필(예: 첫 기록 날짜), 일정형 챌린지는 “완료”로 마킹 등.
   - 백엔드에서 `start_date/end_date` 필드를 더 이상 신뢰하지 않도록 가드.

6) **분석/테스트**
   - 단위 테스트: 일차/상태 계산, startedAt 헤더 필수 여부, 기록 필터링.
   - 통합/수동: 챌린지 선택→오늘 실천→기록→히스토리/상세 진행률 플로우.
   - 분석 로깅이 일정형 필드를 기대하지 않는지 확인.

7) **문서/ADR 정리**
   - ADR-0002 및 관련 문서에서 일정형 제거 후 모델 설명 업데이트.
   - DEVELOPMENT/README/체크리스트 등 API 계약 변경 사항 반영.

## 아키텍처 결정 사항
이 작업과 관련된 중요한 아키텍처 결정은 [ADR-0003: 챌린지 모델 통일](../../adr/0003-challenge-model-unification.md)에 문서화되어 있습니다.

## 완료 요약

모든 단계가 완료되었습니다:
- ✅ 1단계: 사용처 인벤토리
- ✅ 2단계: 단일 모델 정의
- ✅ 3단계: 백엔드 정리
- ✅ 4단계: 프런트 정리
- ✅ 5단계: 데이터/마이그레이션
- ✅ 6단계: 분석/테스트
- ✅ 7단계: 문서/ADR 정리

### 주요 변경 사항
- 모든 챌린지를 선택형 모델(`startedAt` 기반)로 통일
- `X-Started-At` 헤더 필수 요구사항 적용
- `start_date`/`end_date` 필드 사용 중단 및 응답에서 제외
- 챌린지 완료 감지 및 자동 초기화 로직 추가
- 실천 완료 후 진행률 자동 업데이트 기능 추가

## 참고 문서
- [사용처 인벤토리](./0001-remove-schedule-based-challenges-inventory.md)
- [API 계약 정의](./0001-remove-schedule-based-challenges-api-contract.md)
