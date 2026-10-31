# 모바일 앱 빌드 가이드

단단이(Dandani) 모바일 앱을 Capacitor를 사용하여 빌드하고 배포하는 방법입니다.

## 📱 플랫폼 상태

- ✅ **Android**: 준비 완료
- ⚠️ **iOS**: 플랫폼 추가 완료 (CocoaPods 설정 필요)

## 🚀 빠른 시작

### Android 앱 빌드

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 웹 앱 빌드
npm run build

# Capacitor 동기화
npx cap sync

# Android Studio에서 열기
npx cap open android
```

### iOS 앱 빌드 (macOS 필요)

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 웹 앱 빌드
npm run build

# Capacitor 동기화
npx cap sync

# CocoaPods 의존성 설치 (수동)
cd ios/App
export LANG=en_US.UTF-8
pod install
cd ../..

# Xcode에서 열기
npx cap open ios
```

## 📋 빌드 전 체크리스트

### 필수 요구사항

#### Android
- [ ] Android Studio 설치
- [ ] Java Development Kit (JDK) 설치
- [ ] Android SDK 설치

#### iOS (macOS만)
- [ ] Xcode 설치
- [ ] CocoaPods 설치: `sudo gem install cocoapods`
- [ ] Apple Developer 계정 (배포용)

### 앱 설정 확인

- [ ] `capacitor.config.json`에서 앱 ID 확인: `com.yetimates.dandani`
- [ ] 앱 이름 확인: `단단이`
- [ ] API URL 확인: `https://dandani-api.amansman77.workers.dev`

## 🔧 Android 빌드

### 개발 빌드

```bash
# Android Studio에서
# Build > Build Bundle(s) / APK(s) > Build APK(s)
```

### 프로덕션 빌드

```bash
# Android Studio에서
# Build > Generate Signed Bundle / APK
# - APK 또는 AAB 선택
# - 키스토어 파일 선택
# - 서명 정보 입력
```

### APK 직접 빌드 (명령줄)

```bash
cd frontend/android
./gradlew assembleRelease

# APK 위치: app/build/outputs/apk/release/app-release.apk
```

## 🍎 iOS 빌드

### 개발 빌드

1. Xcode에서 프로젝트 열기
2. 시뮬레이터 또는 실제 기기 선택
3. Run 버튼 클릭

### 프로덕션 빌드 (App Store)

1. Xcode에서 프로젝트 열기
2. Product > Archive
3. Organizer에서 배포 옵션 선택
4. App Store Connect에 업로드

## 📦 앱 아이콘 및 스플래시 스크린

### 아이콘 생성

```bash
cd frontend
npm run icons:make   # scripts/make-icons.js assets/dandani-emblem-source.png
```

원본 한 장(`assets/dandani-emblem-source.png`)에서 문양을 찾아 잘라낸 뒤, 그 기준 이미지로 아래를 모두 만든다.

- 웹: `public/favicon/`, `public/assets/icons/`
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Android: `android/app/src/main/res/mipmap-*/`(일반·원형·적응형 전경/배경)
- 네이티브 빌드용 기준 이미지: `assets/icon/icon.png`

예전 `generate-icons.js`는 2026-10-23에 지웠다. 그 스크립트는 Android 적응형 아이콘을 투명 전경과 크림색
배경으로 만들었다. 옛 캐릭터 아이콘에는 맞았지만 어두운 문양에는 맞지 않았다. 9/25 아이콘을 문양으로
바꿀 때도 돌리지 않아서 Android만 10/23까지 옛 캐릭터 아이콘이었다.

### 스플래시 스크린

Capacitor 설정에서 자동으로 생성되며, `capacitor.config.json`에서 설정 가능:

```json
{
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#faf5e9"
    }
  }
}
```

## 🔄 워크플로우

### 개발 중

```bash
# 1. 웹 앱 수정
# 2. 빌드
npm run build

# 3. Capacitor 동기화
npx cap sync

# 4. 네이티브 앱에서 확인
npx cap open android  # 또는 ios
```

### 자동화 스크립트

```bash
# Android 빌드 및 열기
npm run cap:android

# iOS 빌드 및 열기
npm run cap:ios
```

## 🐛 문제 해결

### iOS CocoaPods 오류

```bash
# UTF-8 인코딩 설정
export LANG=en_US.UTF-8

# CocoaPods 재설치
cd ios/App
pod deintegrate
pod install
```

### Android 빌드 오류

```bash
# Gradle 캐시 정리
cd android
./gradlew clean

# 의존성 재동기화
npx cap sync
```

### 웹 앱 변경사항이 반영되지 않음

```bash
# 빌드 후 동기화 필수
npm run build
npx cap sync
```

## 📱 테스트

### Android

```bash
# 개발 빌드 설치
adb install app/build/outputs/apk/debug/app-debug.apk

# 또는 Android Studio에서 직접 실행
```

### iOS

```bash
# Xcode에서 시뮬레이터 또는 실제 기기 선택 후 실행
```

## 🚀 배포

### Google Play Store

1. Google Play Console에 앱 등록
2. 서명된 AAB 파일 업로드
3. 스토어 리스팅 작성
4. 검토 제출

### Apple App Store

1. App Store Connect에 앱 등록
2. Xcode에서 Archive 생성
3. Organizer에서 App Store Connect에 업로드
4. 스토어 리스팅 작성
5. 검토 제출

## 📝 참고 자료

- [Capacitor 공식 문서](https://capacitorjs.com/docs)
- [Android 개발 가이드](https://developer.android.com/)
- [iOS 개발 가이드](https://developer.apple.com/ios/)
