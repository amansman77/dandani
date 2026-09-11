# 알려진 작업 혼란과 대응 방법

이 문서는 2026-09-12 프로젝트 컨텍스트 정리와 배포 중 실제로 마주친 혼란을 기록한다.
다음 작업자는 [프로젝트 컨텍스트](PROJECT_CONTEXT.md)를 읽은 뒤 이 문서를 확인한다.

## 1. 오래된 문서가 현재 제품처럼 보인다

**증상:** 과거 ADR·실험·계획 문서에서 챌린지, 실천, AI 상담사 API가 현재 기능처럼 보인다.

**원인:** 2026-08-28 문장 되새기기 제품으로 전환한 뒤 역사 문서와 레거시 Worker 파일,
D1 데이터를 의도적으로 남겼다.

**대응:** 현재 기능은 다음 순서로 판단한다.

1. `frontend/src/index.js`에서 실제로 도달 가능한 import
2. `workers/src/router.js`에 현재 등록된 라우트
3. `docs/PROJECT_CONTEXT.md`
4. Accepted ADR
5. 과거 개발·실험·계획 문서

`challenge`, `practice`, `story`, `timefold` 파일이 있다는 이유만으로 활성 기능으로
판단하지 않는다. 자세한 상태는 ADR-0005를 확인한다.

## 2. worktree의 표시 경로와 실제 경로가 다를 수 있다

**증상:** `pwd`가 작업 지시의 `/tmp/...` 대신 `/private/tmp/...`를 출력한다.

**원인:** macOS에서 `/tmp`가 `/private/tmp`를 가리킨다. 두 경로는 같은 worktree일 수 있다.

**대응:** 경로 문자열만 보고 다른 저장소라 판단하지 말고 `git branch --show-current`,
`git status --short`, `git rev-parse --show-toplevel`로 작업 대상을 확인한다.

## 3. Git 쓰기는 worktree 관리 디렉터리 권한이 필요하다

**증상:** 파일은 수정할 수 있지만 `git add`나 `git commit`에서 `.git/worktrees/.../index.lock`
생성 권한 오류가 난다.

**원인:** 연결된 worktree의 Git 메타데이터가 작업 디렉터리 밖의 원본 저장소에 있다.
샌드박스 환경에서는 소스 파일 쓰기 권한과 Git 메타데이터 쓰기 권한이 다를 수 있다.

**대응:** 잠금 파일을 수동 삭제하거나 우회하지 않는다. 현재 브랜치와 변경 대상을 확인한 뒤
Git 메타데이터 쓰기에 필요한 승인을 요청한다.

## 4. 호스트에는 `rg`가 있지만 실행 환경마다 확인한다

**현재 상태:** 2026-09-12 macOS arm64 호스트에 Homebrew로 `ripgrep 15.2.0`을 설치했다.
실행 파일은 `/opt/homebrew/bin/rg`이며 PCRE2를 지원한다.

```bash
command -v rg
rg --version
```

**주의:** 호스트 설치가 별도 컨테이너, CI, 초기화된 샌드박스까지 보장하지는 않는다.
작업 시작 시 위 명령으로 확인하고, 사용할 수 없으면 설치 때문에 탐색을 멈추지 말고
`find`, `grep`, `sed`로 대체한다. zsh에서 `path`는 `PATH`와 연결된 특수 변수이므로
반복문 변수로 쓰지 않는다. `file_path`처럼 의도가 분명한 이름을 사용한다.

## 5. 깨끗한 worktree에는 빌드 의존성이 없을 수 있다

**증상:** `npm run build:frontend`가 `react-scripts: command not found`로 실패한다.

**원인:** `node_modules`가 없으며 저장소에는 의존성을 커밋하지 않는다.

**대응:** 루트에서 `npm ci`를 실행해 workspace 잠금 파일 그대로 설치한 후 빌드한다.
설치가 `package-lock.json`을 바꾸지 않았는지 `git status --short`로 확인한다.

현재 설치 시 오래된 간접 의존성과 취약점 경고가 나타날 수 있다. 이 경고는 별도 의존성
정비 작업으로 다루며, 검토 없이 `npm audit fix --force`를 실행하지 않는다.

## 6. 성공한 빌드에도 기존 경고가 있다

**증상:** 프런트엔드 빌드가 PostHog React 소스맵 파일 누락과 오래된 Browserslist 데이터
경고를 출력하면서도 성공한다.

**원인:** 현재 잠금 파일의 간접 의존성 및 패키지 배포물 상태다.

**대응:** 종료 코드와 `frontend/build` 생성을 먼저 확인한다. 경고를 새 오류로 오인하지
않되, 새 경고인지 비교해 기록한다. 문서만 바꾸는 작업에서 의존성 업데이트까지 섞지 않는다.

## 7. Pages와 Worker는 브랜치 배포 의미가 다르다

**증상:** 기능 브랜치에서 Pages를 배포하면 해시 URL과 브랜치 별칭 URL이 나오지만,
Worker를 배포하면 공용 `dandani-api` URL이 갱신된다.

**원인:** Cloudflare Pages는 비기본 Git 브랜치 이름을 감지해 브랜치 배포 별칭을 만든다.
반면 `workers/wrangler.toml`의 Worker 이름은 브랜치와 무관하게 `dandani-api` 하나다.

**대응:**

- Pages 브랜치 배포를 `dandani.pages.dev` 또는 커스텀 도메인의 프로덕션 승격으로
  오인하지 않는다.
- 해시가 포함된 Pages 배포 URL은 매번 바뀐다. 문서의 정적 값을 최신 배포로 믿지 말고
  `npx wrangler@latest pages deployment list --project-name dandani`로 확인한다.
- `npm run deploy:workers`는 기능 브랜치에서도 공유 Worker를 갱신하므로, 코드 변경이
  있으면 배포 권한과 영향을 다시 확인한다.
- 문서 전용 변경은 Worker 런타임 배포가 기술적으로 필요하지 않다. 사용자가 전체 배포를
  명시한 경우에만 실행한다.

## 8. 배포 검증은 현재 API로 한다

레거시 `/api/practice/today`, `/api/challenges`는 의도적으로 라우터에서 제거되어 404가
정상이다. 이 경로로 Worker 배포 성공 여부를 판단하지 않는다.

현재 읽기 전용 스모크 체크는 `GET /api/phrases/active`를 사용하며 다음 헤더가 필요하다.

```bash
curl -i \
  -H 'X-User-ID: deploy-smoke-check' \
  -H 'X-Client-Time: 2026-09-12T00:00:00.000Z' \
  -H 'X-Client-Timezone: Asia/Seoul' \
  https://dandani-api.amansman77.workers.dev/api/phrases/active
```

날짜는 실행 시점의 ISO 8601 값으로 바꾼다. Discord 수동 발송 API는 실제 외부 메시지를
전송하므로 상태 확인용으로 호출하지 않는다.
