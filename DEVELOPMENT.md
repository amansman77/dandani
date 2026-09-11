# 단단이 (Dandani) 개발 가이드

> **문서 범위 안내:** 이 문서에는 챌린지와 AI 상담사 시절의 과거 개발 정보가 일부
> 남아 있습니다. 현재 제품 경계, 활성 API, 표준 용어는
> [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md)를 우선하세요.

## 📋 목차
- [개요](#개요)
- [개발 환경 설정](#개발-환경-설정)
- [프로젝트 구조](#프로젝트-구조)
- [로컬 개발](#로컬-개발)
- [API 연동](#api-연동)
- [배포](#배포)
- [아키텍처](#아키텍처)
- [코딩 스타일](#코딩-스타일)
- [테스트](#테스트)
- [문제 해결](#문제-해결)

## 🎯 개요

단단이는 감정적으로 단단해지는 연습을 돕는 서비스입니다. React 기반 프론트엔드와 Cloudflare Workers 기반 백엔드로 구성되어 있습니다.

### 핵심 기능
- **오늘의 연습**: 매일 실천 과제 제공
- **AI 상담사**: 감정 기반 AI 대화 (buddy API 연동)
- **반응형 UI**: 모바일 친화적 인터페이스

## 🛠️ 개발 환경 설정

### 필수 요구사항
- **Node.js**: 20.0.0 이상 (Wrangler CLI 요구사항)
- **npm**: 10.2.3 이상
- **Wrangler CLI**: Cloudflare Workers/Pages 개발용 (v4.26.0 이상)

### Node.js 설정
```bash
# nvm으로 Node.js 버전 설정 (Wrangler CLI 호환성을 위해 20.x 사용)
nvm install 20
nvm use 20

# 버전 확인
node --version  # v20.x.x
npm --version   # v10.x.x
```

### nvm 설치 (필요시)
```bash
# nvm이 설치되어 있지 않은 경우
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 터미널 재시작 또는 설정 로드
source ~/.zshrc
```

### 프로젝트 클론 및 설정
```bash
# 저장소 클론
git clone https://github.com/amansman77/dandani.git
cd dandani

# 프론트엔드 의존성 설치
cd frontend
npm install
cd ..

# Workers 의존성 설치
cd workers
npm install
cd ..
```

## 📁 프로젝트 구조

```
dandani/
├── frontend/              # React 프론트엔드
│   ├── src/               # 소스 코드
│   │   ├── components/    # 재사용 가능한 컴포넌트
│   │   │   └── ChatInterface.js # AI 상담사 채팅 컴포넌트
│   │   ├── utils/        # 유틸리티 함수
│   │   ├── App.js         # 메인 앱 컴포넌트
│   │   └── index.js       # 앱 진입점
│   ├── public/            # 정적 파일
│   ├── package.json       # 프론트엔드 의존성
│   └── capacitor.config.json # Capacitor 설정
├── workers/               # Cloudflare Workers 백엔드
│   ├── src/               # Workers 소스 코드
│   ├── schemas/           # 데이터베이스 스키마 파일
│   ├── package.json       # Workers 의존성
│   └── wrangler.toml      # Workers 설정
├── docs/                  # 문서
│   ├── adr/               # Architecture Decision Records
│   ├── design-prototypes/ # 디자인 프로토타입
│   └── experiments/       # 실험 문서
├── scripts/               # 유틸리티 스크립트
│   └── resize-images.js   # 이미지 리사이즈 스크립트
└── README.md              # 프로젝트 문서
```

## 🚀 로컬 개발

### 프론트엔드 개발 서버 실행
```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 개발 서버 시작 (포트 3000)
npm start

# 브라우저에서 확인
# http://localhost:3000
```

### 백엔드 개발 서버 실행 (선택사항)
```bash
# Workers 개발 서버 시작 (포트 8787)
cd workers

# use nvm
nvm use 20

npm run dev

# API 테스트
# http://localhost:8787/api/practice/today
```

### 환경 변수 설정
```bash
# 프론트엔드 환경 변수 (선택사항)
REACT_APP_API_URL=http://localhost:8787

# 기본값: https://dandani-api.amansman77.workers.dev
```

## 🔗 API 연동

### 백엔드 API
- **프로덕션**: `https://dandani-api.amansman77.workers.dev`
- **개발**: `http://localhost:8787` (Workers 실행 시)

### 주요 API 엔드포인트

#### 챌린지 관련 API
모든 챌린지 관련 API 요청은 다음 헤더를 포함해야 합니다:
- `X-Started-At`: 챌린지 시작일시 (ISO 8601 형식, 필수)
- `X-User-ID`: 사용자 ID (필수)
- `X-Client-Timezone`: 클라이언트 시간대 (필수)
- `X-Client-Time`: 클라이언트 현재 시간 (ISO 8601, 필수)

**예외**: `/api/challenges` (목록 조회)는 `X-Started-At` 선택사항

```javascript
// 오늘의 실천 과제 조회
GET /api/practice/today?challengeId=12&startedAt=2025-01-10T00:00:00.000Z
Headers: {
  "X-Started-At": "2025-01-10T00:00:00.000Z",
  "X-User-ID": "user123",
  "X-Client-Timezone": "Asia/Seoul",
  "X-Client-Time": "2025-01-10T12:00:00.000Z"
}

// 응답 예시
{
  "id": 189,
  "challenge_id": 12,
  "day": 1,
  "title": "오늘의 단단이가 되는 법",
  "description": "실천 과제 내용...",
  "isRecorded": false
}

// 챌린지 목록 조회
GET /api/challenges
Headers: {
  "X-User-ID": "user123",
  "X-Client-Timezone": "Asia/Seoul",
  "X-Client-Time": "2025-01-10T12:00:00.000Z"
  // X-Started-At는 선택사항
}

// 챌린지 상세 조회
GET /api/challenges/:id
Headers: {
  "X-Started-At": "2025-01-10T00:00:00.000Z", // 필수
  "X-User-ID": "user123",
  "X-Client-Timezone": "Asia/Seoul",
  "X-Client-Time": "2025-01-10T12:00:00.000Z"
}
```

**중요**: 
- `start_date`/`end_date` 필드는 더 이상 사용하지 않으며, 모든 API 응답에서 제외됩니다.
- 모든 챌린지는 선택형 모델(`startedAt` 기반)로 통일되었습니다.
- `X-Started-At` 헤더가 누락된 경우 400 Bad Request를 반환합니다.

### Buddy AI API 연동
- **URL**: `https://buddy.yetimates.com/api/chat/dandani`
- **서비스**: 단단이 전용 AI 상담사
- **감정**: happy, sad, angry, anxious, frustrated, tired, neutral

```javascript
// AI 상담사 API 호출 예시
POST /api/chat/dandani
{
  "message": "오늘 기분이 좋아요",
  "emotion": "happy",
  "sessionId": "dandani-123456789",
  "service": "dandani",
  "practice": practice
}
```

## 🚀 배포

### 프론트엔드 배포 (Cloudflare Pages)
```bash
# use nvm
nvm use 20

# 프론트엔드 디렉토리로 이동
cd frontend

# 프로덕션 빌드
npm run build

# Cloudflare Pages 배포
npx wrangler pages deploy build --project-name dandani

# 배포 확인
# https://dandani.pages.dev
# https://dandani.yetimates.com (프로덕션)
```

### 백엔드 배포 (Cloudflare Workers)
```bash
# Workers 배포
cd workers

nvm use 20
npm run deploy

# 배포 확인
# https://dandani-api.amansman77.workers.dev
```

### 배포 상태 확인
```bash
# Pages 프로젝트 목록
npx wrangler pages project list

# Pages 배포 목록
npx wrangler pages deployment list --project-name dandani

# Workers 배포 목록
cd workers
npx wrangler deployments list
```

### 배포 워크플로우
1. **개발 브랜치에서 작업**
2. **변경사항 커밋 및 푸시**
3. **main 브랜치로 머지**
4. **main 브랜치에서 프로덕션 배포**

## 🏗️ 아키텍처

### 프론트엔드 (React)
- **프레임워크**: React 18.2.0
- **UI 라이브러리**: Material-UI 5.15.10
- **아이콘**: @mui/icons-material 5.17.1
- **스타일링**: @emotion/react, @emotion/styled
- **상태 관리**: App.js에서 통합 상태 관리 (채팅 메시지, 세션 ID)

### 백엔드 (Cloudflare Workers)
- **런타임**: Cloudflare Workers
- **데이터베이스**: Cloudflare D1 (SQLite)
- **스토리지**: Cloudflare R2
- **인증**: Cloudflare Access

### 배포 인프라
- **프론트엔드**: Cloudflare Pages
- **백엔드**: Cloudflare Workers
- **CDN**: Cloudflare 전역 네트워크

### 상태 관리 구조
```javascript
// App.js에서 관리하는 상태
const [chatMessages, setChatMessages] = useState([]);
const [chatSessionId] = useState(`dandani-${Date.now()}-${random}`);

// ChatInterface에 props로 전달
<ChatInterface 
  practice={practice} 
  messages={chatMessages}
  setMessages={setChatMessages}
  sessionId={chatSessionId}
/>
```

## 📝 코딩 스타일

### JavaScript/React 규칙
- **함수형 컴포넌트** 사용
- **Hooks** 활용 (useState, useEffect, useRef)
- **ES6+ 문법** 사용
- **const/let** 사용 (var 금지)
- **제어 컴포넌트 패턴** 활용 (상태를 상위 컴포넌트에서 관리)

### 컴포넌트 구조
```javascript
// 컴포넌트 템플릿
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

const ComponentName = ({ prop1, prop2, setProp1 }) => {
  const [localState, setLocalState] = useState(null);

  useEffect(() => {
    // 초기화 로직
  }, []);

  return (
    <Box>
      <Typography>컴포넌트 내용</Typography>
    </Box>
  );
};

export default ComponentName;
```

### 스타일링 규칙
- **Material-UI styled** 사용
- **theme.spacing()** 활용
- **반응형 디자인** 고려
- **일관된 색상 팔레트** 사용

## 🧪 테스트

### 프론트엔드 테스트
```bash
# 테스트 실행
npm test

# 테스트 커버리지
npm test -- --coverage
```

### API 테스트
```bash
# 백엔드 API 테스트
curl -X GET https://dandani-api.amansman77.workers.dev/api/practice/today

# Buddy API 테스트
curl -X POST https://buddy.yetimates.com/api/chat/dandani \
  -H "Content-Type: application/json" \
  -d '{"message": "테스트", "emotion": "happy"}'
```

## 🔧 문제 해결

### 일반적인 문제들

#### 1. Node.js 버전 문제
```bash
# Wrangler CLI 호환성을 위해 Node.js 20.x 사용
nvm install 20
nvm use 20
```

#### 2. Wrangler CLI 설치 문제
```bash
# Wrangler CLI 버전 확인
npx wrangler --version

# 최신 버전으로 업데이트
npm install -g wrangler@latest
```

#### 3. 의존성 설치 문제
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

#### 4. Workers 로컬 실행 문제
```bash
# Wrangler 업데이트
cd workers
npm install wrangler@latest

# 또는 프로덕션 API 사용
# 프론트엔드에서 프로덕션 API URL 사용
```

#### 5. Material-UI 아이콘 문제
```bash
# 아이콘 패키지 설치
npm install @mui/icons-material@^5.15.10 --legacy-peer-deps
```

#### 6. 배포 시 git 변경사항 경고
```bash
# 변경사항 커밋 후 배포
git add .
git commit -m "feat: 새로운 기능 추가"
npx wrangler pages deploy build --project-name dandani

# 또는 경고 무시하고 배포
npx wrangler pages deploy build --project-name dandani --commit-dirty=true
```

### 디버깅 팁
- **브라우저 개발자 도구** 활용
- **React Developer Tools** 설치
- **Network 탭**에서 API 호출 확인
- **Console 로그** 확인
- **상태 관리**: App.js에서 관리하는 상태 확인

## 📚 추가 리소스

### 문서
- [React 공식 문서](https://react.dev/)
- [Material-UI 문서](https://mui.com/)
- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages 문서](https://developers.cloudflare.com/pages/)

### 도구
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Dashboard](https://dash.cloudflare.com/)

## 🤝 기여하기

### 개발 워크플로우
1. **이슈 생성** 또는 **기존 이슈 확인**
2. **브랜치 생성**: `feature/기능명` 또는 `fix/버그명`
3. **개발 및 테스트**
4. **커밋**: 의미있는 커밋 메시지 작성
5. **Pull Request 생성**
6. **코드 리뷰 및 머지**

### 커밋 메시지 규칙
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 스타일 변경
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 프로세스 또는 보조 도구 변경
```

---

**단단이 개발팀**  
마지막 업데이트: 2025-07-26
