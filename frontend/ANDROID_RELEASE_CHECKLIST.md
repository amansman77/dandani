# Android 앱 출시 체크리스트

단단이 Android 앱을 Google Play Store에 출시하기 위한 체크리스트입니다.

## ✅ 완료된 항목

- [x] Capacitor 설정 완료
- [x] Android 플랫폼 추가 완료
- [x] 앱 아이콘 생성 완료 (모든 크기)
- [x] 스플래시 이미지 생성 완료 (모든 크기)
- [x] Application ID: `com.yetimates.dandani`
- [x] Version: `1.0` (versionCode: 1)

## 📋 출시 전 필수 체크리스트

### 1. 앱 정보 설정

#### Android 프로젝트 설정
- [ ] **Application ID**: `com.yetimates.dandani` 확인
- [ ] **Version Name**: `1.0` 확인
- [ ] **Version Code**: `1` 확인
- [ ] **Min SDK Version**: 확인 (현재 설정값)
- [ ] **Target SDK Version**: 확인 (현재 설정값)

#### 앱 이름 및 아이콘
- [x] 앱 이름: `단단이` (strings.xml)
- [x] 앱 아이콘: 모든 크기 생성 완료
- [x] 스플래시 이미지: 모든 크기 생성 완료

### 2. 서명 설정

#### 키스토어 생성
- [ ] 키스토어 파일 생성 (`dandani-release-key.jks`)
- [ ] 키스토어 비밀번호 안전하게 보관
- [ ] 키 별칭 (alias) 설정

#### 서명 설정 파일
- [ ] `android/keystore.properties` 파일 생성
- [ ] `android/app/build.gradle`에 서명 설정 추가
- [ ] 서명 테스트 빌드 성공 확인

### 3. 빌드 준비

#### 웹 앱 빌드
- [ ] `npm run build` 성공
- [ ] `npx cap sync android` 성공
- [ ] 빌드 오류 없음 확인

#### Android 빌드
- [ ] Android Studio에서 프로젝트 열기 성공
- [ ] Gradle 동기화 완료
- [ ] 의존성 다운로드 완료

### 4. Google Play Console 준비

#### 계정 설정
- [ ] Google Play Developer 계정 생성 ($25)
- [ ] 결제 정보 등록
- [ ] 개발자 정보 입력

#### 앱 등록
- [ ] 앱 만들기
- [ ] 앱 이름: `단단이` 또는 `Dandani`
- [ ] 기본 언어: 한국어
- [ ] 앱 또는 게임: 앱
- [ ] 무료 또는 유료: 무료

### 5. 스토어 리스팅

#### 필수 정보
- [ ] **앱 이름**: `단단이`
- [ ] **간단한 설명**: (최대 80자)
- [ ] **전체 설명**: (최대 4000자)
- [ ] **앱 아이콘**: 512x512 PNG (준비 완료)
- [ ] **기능 그래픽**: (선택사항, 1024x500)

#### 스크린샷
- [ ] Phone 스크린샷: 최소 2개 (권장: 4-8개)
  - 크기: 1080 x 1920 이상
- [ ] 7-inch Tablet 스크린샷: (선택사항)
  - 크기: 1200 x 1920 이상
- [ ] 10-inch Tablet 스크린샷: (선택사항)
  - 크기: 1600 x 2560 이상

#### 카테고리 및 등급
- [ ] 앱 카테고리 선택 (건강 및 피트니스, 라이프스타일 등)
- [ ] 콘텐츠 등급 설정
- [ ] 대상 고객 설정

### 6. 개인정보 보호 및 권한

#### 권한 설정
- [x] 인터넷 권한 (AndroidManifest.xml)
- [ ] 추가 권한이 필요한 경우 설명 추가

#### 개인정보 보호
- [ ] 개인정보 보호 정책 URL (필요시)
- [ ] 데이터 안전 섹션 설정
- [ ] 데이터 수집 여부 확인

### 7. 빌드 및 업로드

#### Release 빌드
- [ ] 서명된 AAB 파일 생성 (`app-release.aab`)
- [ ] 빌드 성공 확인
- [ ] 파일 크기 확인 (최대 150MB)

#### 내부 테스트
- [ ] 내부 테스트 트랙 생성
- [ ] 테스터 이메일 추가
- [ ] AAB 파일 업로드
- [ ] 릴리스 노트 작성
- [ ] 검토 제출

### 8. 테스트

#### 로컬 테스트
- [ ] Release APK 설치 테스트
- [ ] 실제 기기에서 실행 확인
- [ ] 주요 기능 동작 확인

#### 내부 테스트
- [ ] 테스터에게 테스트 링크 공유
- [ ] 피드백 수집
- [ ] 버그 수정 (필요시)

### 9. 프로덕션 출시

#### 최종 확인
- [ ] 모든 체크리스트 완료
- [ ] 버그 없음 확인
- [ ] 스토어 리스팅 완료

#### 출시
- [ ] 프로덕션 트랙으로 승격
- [ ] 검토 제출
- [ ] 출시 완료 대기 (보통 1-3일)

## 🚀 빠른 시작

### 1단계: 웹 앱 빌드 및 동기화
```bash
cd frontend
npm run build
npx cap sync android
```

### 2단계: Android Studio 열기
```bash
npm run cap:android
```

### 3단계: 서명 설정
- 키스토어 생성
- keystore.properties 설정
- build.gradle 업데이트

### 4단계: Release 빌드
- Android Studio: `Build > Generate Signed Bundle / APK`
- AAB 파일 생성

### 5단계: Google Play Console 업로드
- 내부 테스트 트랙에 AAB 업로드
- 검토 제출

## 📝 참고사항

- **AAB vs APK**: Google Play Store는 AAB를 권장합니다
- **버전 코드**: 매 업데이트마다 증가해야 합니다
- **검토 시간**: 보통 1-3일 소요됩니다
- **테스트**: 내부 테스트를 통해 충분히 테스트하세요

## 🔗 유용한 링크

- [Google Play Console](https://play.google.com/console)
- [Android 개발자 가이드](https://developer.android.com/)
- [Capacitor Android 가이드](https://capacitorjs.com/docs/android)

