# 배포 가이드

단단이(Dandani) 프로젝트의 배포 방법과 배포 상태를 관리합니다.

> 기능 브랜치의 Pages 배포와 공유 Worker 배포는 영향 범위가 다릅니다. 배포 전에
> [알려진 작업 혼란과 대응 방법](docs/KNOWN_PITFALLS.md#7-pages와-worker는-브랜치-배포-의미가-다르다)을
> 확인하세요.

## 🚀 배포 상태

### 프론트엔드 (Cloudflare Pages)
- **프로젝트명**: `dandani`
- **최신 배포 URL**: 배포마다 바뀌므로 `pages deployment list` 명령으로 확인
- **프로덕션 URL**: https://dandani.pages.dev
- **커스텀 도메인**: https://dandani.yetimates.com
- **빌드 디렉토리**: `frontend/build`

### 백엔드 (Cloudflare Workers)
- **Worker 이름**: `dandani-api`
- **배포 URL**: https://dandani-api.amansman77.workers.dev
- **Cron Job**: UTC 09:00 일일 보고서, UTC 22:30 일일 인사이트
- **데이터베이스**: D1 Database (`dandani-db`)

## 📋 배포 절차

### 1. 프론트엔드 배포

```bash
# Node.js 버전 확인
nvm use 20

# 프론트엔드 디렉토리로 이동
cd frontend

# 의존성 설치 (필요시)
npm install

# 프로덕션 빌드
npm run build

# Cloudflare Pages 배포
npx wrangler@latest pages deploy build --project-name dandani

# 또는 커밋되지 않은 변경사항이 있어도 배포하려면
npx wrangler@latest pages deploy build --project-name dandani --commit-dirty=true
```

### 2. 백엔드 배포

```bash
# Workers 디렉토리로 이동
cd workers

# Node.js 버전 확인
nvm use 20

# 의존성 설치 (필요시)
npm install

# Workers 배포
npm run deploy
```

### 3. 전체 배포 (한 번에)

```bash
# 루트 디렉토리에서
npm run build:frontend
npm run deploy:workers

# 또는 수동으로
cd frontend && npm run build && npx wrangler@latest pages deploy build --project-name dandani
cd ../workers && npm run deploy
```

## 🔍 배포 확인

### 프론트엔드 확인
```bash
# 배포 목록 확인
npx wrangler@latest pages deployment list --project-name dandani

# 프로젝트 정보 확인
npx wrangler@latest pages project list
```

### 백엔드 확인
```bash
cd workers
npx wrangler deployments list
```

### API 테스트
```bash
# 활성 문장 조회 (날짜는 실행 시점 값으로 변경)
curl \
  -H 'X-User-ID: deploy-smoke-check' \
  -H 'X-Client-Time: 2026-09-12T00:00:00.000Z' \
  -H 'X-Client-Timezone: Asia/Seoul' \
  https://dandani-api.amansman77.workers.dev/api/phrases/active
```

## ⚙️ 환경 변수

### 프론트엔드

#### 로컬 개발
프론트엔드 디렉토리에 `.env` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
# PostHog Analytics 설정
REACT_APP_POSTHOG_KEY=phc_
REACT_APP_POSTHOG_HOST=https://

# API 엔드포인트 URL
REACT_APP_API_URL=https://
```

#### Cloudflare Pages 배포
Cloudflare Pages 대시보드에서 환경 변수를 설정해야 합니다:

1. **Cloudflare 대시보드 접속**
   - https://dash.cloudflare.com → Pages → `dandani` 프로젝트 선택

2. **환경 변수 설정**
   - Settings → Environment variables → Add variable
   - Production 환경에 다음 변수 추가:
     - `REACT_APP_POSTHOG_KEY`: `phc_`
     - `REACT_APP_POSTHOG_HOST`: `https://`
     - `REACT_APP_API_URL`: `https://`

3. **빌드 설정 확인**
   - Build settings에서 빌드 명령어: `npm run build`
   - 빌드 출력 디렉토리: `build`

**참고**: 환경 변수는 빌드 시점에 주입되므로, 환경 변수 변경 후에는 재배포가 필요합니다.

### 백엔드
- `DISCORD_WEBHOOK_URL`: 디스코드 웹훅 URL (일일 보고서용)
  - Cloudflare Workers Secrets로 관리
  - 설정: `npx wrangler secret put DISCORD_WEBHOOK_URL`

## 📝 배포 체크리스트

배포 전 확인사항:

- [ ] 프론트엔드 빌드 성공 확인
- [ ] API 엔드포인트 URL 확인
- [ ] 환경 변수 설정 확인
- [ ] Workers 의존성 설치 확인
- [ ] 데이터베이스 스키마 최신 버전 확인
- [ ] 배포 후 기능 테스트

## 🔄 롤백 방법

### 프론트엔드 롤백
```bash
# 이전 배포 확인
npx wrangler@latest pages deployment list --project-name dandani

# 특정 배포로 롤백
npx wrangler@latest pages deployment rollback <deployment-id> --project-name dandani
```

### 백엔드 롤백
```bash
cd workers
# 이전 배포 확인
npx wrangler deployments list

# 특정 버전으로 롤백
npx wrangler rollback <version-id>
```

## 🐛 문제 해결

### 빌드 실패
- Node.js 버전 확인 (v20.x 권장)
- `node_modules` 삭제 후 재설치
- 캐시 삭제: `npm cache clean --force`

### 배포 실패
- Wrangler CLI 버전 확인
- Cloudflare 인증 확인: `npx wrangler login`
- 프로젝트 권한 확인

### API 연결 실패
- CORS 설정 확인
- API URL 환경 변수 확인
- Workers 로그 확인: `npx wrangler tail`

## 📅 배포 이력

- **2025-12-05**: 프로젝트 구조 정리 후 재배포
  - 프론트엔드: `frontend/` 디렉토리로 이동
  - 백엔드: `workers/schemas/` 디렉토리로 스키마 정리
