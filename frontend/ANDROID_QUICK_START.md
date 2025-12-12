# Android 빠른 시작 가이드

Android 앱 빌드를 위한 빠른 시작 가이드입니다.

## ⚠️ 현재 상태 확인

터미널에서 다음 명령어로 확인:

```bash
# Android SDK 경로 확인
echo $ANDROID_HOME

# adb 확인
adb version

# Java 확인
java -version
```

## 🚀 Android SDK 설치 (필요한 경우)

### 방법 1: Android Studio 설치 (권장)

1. **Android Studio 다운로드**
   - https://developer.android.com/studio 접속
   - macOS용 다운로드 및 설치

2. **첫 실행 시 SDK 자동 설치**
   - Android Studio 실행
   - Setup Wizard에서 SDK 자동 설치

3. **환경 변수 설정**

`~/.zshrc` 파일에 추가:

```bash
# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

적용:

```bash
source ~/.zshrc
```

### 방법 2: Command Line Tools만 설치

```bash
# SDK 디렉토리 생성
mkdir -p ~/Library/Android/sdk

# Command Line Tools 다운로드
cd ~/Library/Android/sdk
curl -O https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip

# 압축 해제
unzip commandlinetools-mac-*_latest.zip
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true

# 환경 변수 설정
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin' >> ~/.zshrc
source ~/.zshrc

# 필수 패키지 설치
sdkmanager --sdk_root=$ANDROID_HOME "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

## ✅ 설치 확인

```bash
# Android SDK 경로
echo $ANDROID_HOME
# 출력: /Users/your-username/Library/Android/sdk

# adb 확인
adb version
# 출력: Android Debug Bridge version 1.0.xx

# Java 확인
java -version
# Java 11 이상 필요
```

## 📱 Android 앱 빌드

### 1. 올바른 디렉토리에서 실행

```bash
# 루트가 아닌 frontend 디렉토리에서 실행
cd /Users/hosung/Workspace/yetimate/dandani/frontend

# Android Studio 열기
npm run cap:android
```

### 2. Android Studio에서 빌드

1. Android Studio가 열리면 프로젝트 동기화 대기
2. **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. 빌드 완료 후 APK 파일 확인

### 3. 실제 기기에서 테스트

```bash
# 기기 연결 확인
adb devices

# APK 설치
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 🐛 문제 해결

### "Missing script: cap:android" 오류

**원인**: 루트 디렉토리에서 실행

**해결**:
```bash
cd frontend
npm run cap:android
```

### "Android SDK not found" 오류

**해결**:
1. Android Studio 설치
2. 환경 변수 설정 (`~/.zshrc`)
3. `source ~/.zshrc` 실행

### "adb: command not found" 오류

**해결**:
```bash
# platform-tools 설치
sdkmanager "platform-tools"

# 환경 변수 확인
echo $ANDROID_HOME
```

## 📝 다음 단계

Android SDK 설치 완료 후:

1. ✅ 환경 변수 설정 확인
2. ✅ `cd frontend` 후 `npm run cap:android` 실행
3. ✅ Android Studio에서 빌드
4. ✅ 실제 기기 또는 에뮬레이터에서 테스트

## 🔗 상세 가이드

- `ANDROID_SDK_SETUP.md` - 상세한 SDK 설치 가이드
- `ANDROID_BUILD.md` - 빌드 및 배포 가이드
- `ANDROID_RELEASE_CHECKLIST.md` - 출시 체크리스트

