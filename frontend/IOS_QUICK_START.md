# iOS 앱 빠른 시작 가이드

## ✅ 준비 완료 상태

- ✅ Capacitor 설정 완료
- ✅ iOS 플랫폼 추가 완료
- ✅ CocoaPods 의존성 설치 완료
- ✅ Xcode 프로젝트 열림
- ✅ 최소 iOS 버전: 15.0

## 🚀 지금 바로 빌드하기

Xcode가 이미 열려있습니다! 다음 단계만 따르면 됩니다:

### 1단계: 시뮬레이터 선택

1. Xcode 상단 툴바에서 기기 선택
2. **iPhone 15 Pro** 또는 원하는 시뮬레이터 선택

### 2단계: 빌드 및 실행

1. **`Cmd + R`** 키를 누르거나
2. 상단의 **▶️ Run** 버튼 클릭

첫 빌드는 1-2분 정도 걸릴 수 있습니다.

## 📱 실제 기기에서 테스트

1. iPhone을 Mac에 USB로 연결
2. Xcode에서 연결된 기기 선택
3. iPhone에서 "이 컴퓨터를 신뢰" 선택
4. **`Cmd + R`** 실행

## ⚙️ Xcode에서 확인할 설정

### 서명 설정 (중요!)

1. 왼쪽 프로젝트 네비게이터에서 **App** 프로젝트 선택
2. **TARGETS > App** 선택
3. **Signing & Capabilities** 탭
4. **Automatically manage signing** 체크
5. **Team** 선택 (Apple Developer 계정)

> ⚠️ Apple Developer 계정이 없으면 시뮬레이터에서만 실행 가능합니다.

### 앱 정보 확인

- **Display Name**: `단단이`
- **Bundle Identifier**: `com.yetimates.dandani`
- **Version**: `0.1.0`
- **Build**: `1`
- **Minimum Deployments**: `15.0`

## 🐛 문제 해결

### 빌드 오류 발생 시

```bash
# Xcode에서: Product > Clean Build Folder (Shift + Cmd + K)
# 또는 명령줄에서:
cd frontend/ios/App
xcodebuild clean
```

### 웹 앱 변경사항 반영

```bash
cd frontend
npm run build
npx cap sync
```

그 다음 Xcode에서 다시 빌드하세요.

## 📦 다음 단계

빌드가 성공하면:

1. ✅ **시뮬레이터/기기에서 앱 실행 확인**
2. 📱 **앱 아이콘 및 스플래시 스크린 커스터마이징**
3. 🧪 **TestFlight으로 베타 테스트**
4. 🚀 **App Store 제출**

## 💡 팁

- **빠른 재빌드**: `Cmd + B` (빌드만, 실행 안 함)
- **시뮬레이터 리셋**: Device > Erase All Content and Settings
- **로그 확인**: Xcode 하단 콘솔 창에서 확인

---

**자세한 가이드는 `IOS_BUILD.md`를 참고하세요.**
