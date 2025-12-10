# iOS 앱 빌드 가이드

단단이 iOS 앱을 빌드하고 배포하는 상세 가이드입니다.

## ✅ 현재 상태

- ✅ Capacitor 설정 완료
- ✅ iOS 플랫폼 추가 완료
- ✅ CocoaPods 의존성 설치 완료
- ✅ Xcode 프로젝트 준비 완료
- ✅ 최소 iOS 버전: 15.0

## 🚀 빠른 빌드

### 1. Xcode에서 빌드

Xcode가 이미 열려있습니다. 다음 단계를 따라주세요:

1. **시뮬레이터 선택**
   - 상단 툴바에서 시뮬레이터 선택 (예: iPhone 15 Pro)
   - 또는 실제 iOS 기기 연결

2. **빌드 및 실행**
   - `Cmd + R` 또는 Run 버튼 클릭
   - 첫 빌드는 시간이 걸릴 수 있습니다

### 2. 명령줄에서 빌드

```bash
cd frontend

# 웹 앱 빌드
npm run build

# Capacitor 동기화
npx cap sync

# Xcode 열기
npm run cap:ios
```

## 📱 빌드 타입

### 개발 빌드 (Development)

1. Xcode에서 프로젝트 열기
2. 상단에서 "App" 스키마 선택
3. 시뮬레이터 또는 실제 기기 선택
4. `Cmd + R` 실행

### 프로덕션 빌드 (Archive)

1. Xcode에서 **Product > Archive** 선택
2. Archive가 완료되면 Organizer 창이 열림
3. **Distribute App** 클릭
4. 배포 방법 선택:
   - **App Store Connect**: App Store 배포
   - **Ad Hoc**: 테스트 기기용
   - **Enterprise**: 엔터프라이즈 배포
   - **Development**: 개발용

## 🔧 프로젝트 설정

### 앱 정보

- **Bundle Identifier**: `com.yetimates.dandani`
- **Display Name**: `단단이`
- **Version**: `0.1.0`
- **Build**: `1`
- **Minimum iOS Version**: `15.0`

### 서명 설정

1. Xcode에서 프로젝트 선택
2. **Signing & Capabilities** 탭
3. **Automatically manage signing** 체크
4. Team 선택 (Apple Developer 계정 필요)

### 권한 설정

현재 필요한 권한:
- 인터넷 연결 (API 호출용)
- 로컬 스토리지 (사용자 데이터 저장)

추가 권한이 필요한 경우 `Info.plist`에 추가:
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>사진을 선택하기 위해 권한이 필요합니다</string>
```

## 🐛 문제 해결

### 빌드 오류

```bash
# Clean Build
# Xcode에서: Product > Clean Build Folder (Shift + Cmd + K)

# 또는 명령줄에서
cd frontend/ios/App
xcodebuild clean
```

### CocoaPods 오류

```bash
cd frontend/ios/App
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
pod deintegrate
pod install
```

### 웹 앱 변경사항 반영

```bash
cd frontend
npm run build
npx cap sync
```

## 📦 App Store 배포

### 1. App Store Connect 설정

1. [App Store Connect](https://appstoreconnect.apple.com) 접속
2. **My Apps** > **+** 클릭
3. 앱 정보 입력:
   - 이름: `단단이`
   - 기본 언어: 한국어
   - Bundle ID: `com.yetimates.dandani`
   - SKU: 고유 식별자

### 2. Archive 및 업로드

1. Xcode에서 **Product > Archive**
2. Organizer에서 **Distribute App**
3. **App Store Connect** 선택
4. **Upload** 선택
5. 서명 옵션 선택 (자동 권장)
6. 업로드 완료 대기

### 3. 스토어 리스팅

1. App Store Connect에서 앱 선택
2. **App Information** 작성
3. **Pricing and Availability** 설정
4. **App Privacy** 설정
5. 스크린샷 및 설명 추가
6. **Submit for Review** 클릭

## 🧪 테스트

### 시뮬레이터 테스트

```bash
# 특정 시뮬레이터에서 실행
xcrun simctl boot "iPhone 15 Pro"
npm run cap:ios
```

### 실제 기기 테스트

1. iOS 기기를 Mac에 연결
2. Xcode에서 기기 선택
3. 신뢰 설정 (기기에서 "이 컴퓨터를 신뢰" 선택)
4. `Cmd + R` 실행

### TestFlight 배포

1. App Store Connect에서 **TestFlight** 탭
2. Archive 업로드 후 자동으로 TestFlight에 추가됨
3. 테스터 추가 및 초대

## 📝 체크리스트

빌드 전 확인:
- [ ] 웹 앱 빌드 성공
- [ ] Capacitor 동기화 완료
- [ ] CocoaPods 의존성 설치 완료
- [ ] Xcode 프로젝트 열림
- [ ] 서명 설정 완료
- [ ] Bundle ID 확인
- [ ] 최소 iOS 버전 확인 (15.0)

배포 전 확인:
- [ ] 앱 아이콘 설정
- [ ] 스플래시 스크린 설정
- [ ] Info.plist 권한 설정
- [ ] App Store Connect 앱 등록
- [ ] 스토어 리스팅 준비

## 🎯 다음 단계

1. **Xcode에서 빌드 테스트**
   - 시뮬레이터에서 실행 확인
   - 실제 기기에서 테스트

2. **앱 아이콘 및 스플래시 스크린 커스터마이징**
   - `ios/App/App/Assets.xcassets`에서 설정

3. **TestFlight 배포**
   - 내부 테스터 초대
   - 피드백 수집

4. **App Store 제출**
   - 스토어 리스팅 완성
   - 검토 제출
