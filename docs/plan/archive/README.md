# 완료된 Plan 문서 아카이브

이 폴더는 완료된 작업 계획 문서들을 보관합니다.

## 아카이브된 문서

### Plan-0001: Remove Schedule-Based Challenges
**완료일**: 2026-01-10

일정형 챌린지(`start_date`/`end_date`)를 제거하고 모든 챌린지를 선택형 모델(`startedAt` 기반)로 통일한 작업입니다.

**관련 문서**:
- [메인 계획](./0001-remove-schedule-based-challenges.md)
- [사용처 인벤토리](./0001-remove-schedule-based-challenges-inventory.md)
- [API 계약 정의](./0001-remove-schedule-based-challenges-api-contract.md)

**주요 변경 사항**:
- 모든 챌린지를 선택형 모델(`startedAt` 기반)로 통일
- `X-Started-At` 헤더 필수 요구사항 적용
- `start_date`/`end_date` 필드 사용 중단 및 응답에서 제외
- 챌린지 완료 감지 및 자동 초기화 로직 추가
- 실천 완료 후 진행률 자동 업데이트 기능 추가
