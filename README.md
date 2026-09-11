# Dandani

**Goal**: 매일 아침, 나에게 필요한 문장 하나를 되새긴다.

> 2026-08-28 제품은 챌린지 중심에서 **하루 한 문장 되새기기** 중심으로 전환했습니다.
> 현재 구조와 표준 용어는 [프로젝트 컨텍스트](docs/PROJECT_CONTEXT.md)를 먼저 확인하세요.

## 소개

**단단이**는 자신에게 필요한 문장 하나를 정하고, 매일 다시 읽으며 기록하는 서비스입니다.

## 서비스 방향

### 1. 나만의 문장

* 추천 문장을 고르거나 자신만의 문장을 직접 작성
* 한 번에 하나의 **활성 문장**에 집중
* 필요할 때 문장을 은퇴시키고 새 문장 시작

### 2. 간단하고 직관적인 UX

* 오늘의 문장을 읽고 **되새기기**를 남기는 단일 핵심 행동
* 지난 문장과 되새긴 날짜를 문장 기록에서 확인

### 3. 연결과 공유

* 다른 사람들이 되새기는 문장을 익명으로 발견
* 내 문장을 이미지나 링크로 공유

## 현재 기술 구성

* **프런트엔드**: React, Material UI, Capacitor
* **API**: Cloudflare Workers
* **데이터**: Cloudflare D1
* **분석/운영**: 자체 이벤트 수집, PostHog, Discord 리포트

## 빠른 시작

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run start:frontend
```

Worker를 로컬에서 함께 실행하려면 별도 터미널에서 다음을 실행합니다.

```bash
npm run dev:workers
```

변경사항을 제출하기 전 전체 품질 게이트를 실행합니다.

```bash
npm run check
```

이 명령은 프런트엔드·Worker lint, Worker 타입 검사, 테스트, Markdown 링크 검사,
프런트엔드 빌드, Worker 번들 dry-run을 순서대로 수행합니다.

핵심 모바일 흐름의 브라우저 스모크 테스트는 Playwright 브라우저를 한 번 설치한 뒤
별도로 실행합니다. 테스트는 로컬 프런트엔드를 시작하고 API를 결정적인 응답으로 대체하므로
운영 데이터에 영향을 주지 않습니다.

```bash
npm ci --prefix automation/ux-check
npx --prefix automation/ux-check playwright install chromium
npm run test:e2e
```

자세한 환경 설정은 루트와 각 workspace의 `package.json` 스크립트를 기준으로 하고,
배포 방법은 [배포 가이드](DEPLOYMENT.md)를 참고하세요. 현재 기능 판단에는
[프로젝트 컨텍스트](docs/PROJECT_CONTEXT.md)를 우선합니다.

## 문서 안내

* [현재 제품과 표준 용어](docs/PROJECT_CONTEXT.md)
* [배포](DEPLOYMENT.md)
* [아키텍처 결정](docs/adr/README.md)

과거 챌린지와 Story Feed 관련 코드·데이터는 의도적으로 일부 보존되어 있습니다. 현재
기능으로 오인하거나 임의로 연결하지 말고
[레거시 백엔드 인벤토리](docs/adr/0005-legacy-backend-inventory.md)를 확인하세요.

## 기여 방법

* 개선 아이디어나 기능 제안은 Issue로 등록해주세요.
* 디자인/개발/콘텐츠 기여 모두 환영합니다.

## 라이선스

본 프로젝트는 [Apache License 2.0](LICENSE)에 따라 배포됩니다.
