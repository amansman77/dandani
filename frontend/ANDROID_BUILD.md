# Android 앱 빌드 및 배포 가이드

단단이 Android 앱을 빌드하고 Google Play Store에 배포하는 상세 가이드입니다.

## ✅ 현재 상태

- ✅ Capacitor 설정 완료
- ✅ Android 플랫폼 추가 완료
- ✅ 앱 아이콘 생성 완료 (모든 크기)
- ✅ 스플래시 이미지 생성 완료 (모든 크기)
- ✅ Application ID: `com.yetimates.dandani`
- ✅ Version: `1.0` (versionCode: 1)

## 🚀 빠른 빌드

### 1. 웹 앱 빌드 및 동기화

```bash
cd frontend

# 웹 앱 빌드
npm run build

# Capacitor 동기화
npx cap sync android
```

### 2. Android Studio에서 빌드

1. **Android Studio 열기**
   ```bash
   npm run cap:android
   ```

2. **빌드 타입 선택**
   - **Debug**: 개발/테스트용
   - **Release**: Google Play Store 배포용

3. **APK 빌드**
   - `Build > Build Bundle(s) / APK(s) > Build APK(s)`
   - 또는 `Build > Generate Signed Bundle / APK`

## 📦 배포용 빌드 (Release)

### 방법 1: Android Studio에서 빌드

1. **Android Studio 열기**
   ```bash
   cd frontend
   npm run cap:android
   ```

2. **서명 설정**
   - `Build > Generate Signed Bundle / APK` 선택
   - **Android App Bundle** 선택 (권장) 또는 **APK** 선택
   - 키스토어 생성 또는 기존 키스토어 사용

3. **빌드**
   - Release 빌드 타입 선택
   - 빌드 완료 후 `app/release/app-release.aab` 또는 `app-release.apk` 생성

### 방법 2: 명령줄에서 빌드

```bash
cd frontend/android

# Release APK 빌드
./gradlew assembleRelease

# Release AAB 빌드 (권장)
./gradlew bundleRelease
```

빌드된 파일 위치:
- APK: `app/build/outputs/apk/release/app-release.apk`
- AAB: `app/build/outputs/bundle/release/app-release.aab`

## 🔐 서명 설정

### 키스토어 생성 (처음 한 번만)

```bash
cd frontend/android/app

keytool -genkey -v -keystore dandani-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias dandani-key-alias
```

**중요**: 키스토어 파일과 비밀번호를 안전하게 보관하세요!

### 키스토어 정보 저장

`android/keystore.properties` 파일 생성:

```properties
storePassword=your-store-password
keyPassword=your-key-password
keyAlias=dandani-key-alias
storeFile=../app/dandani-release-key.jks
```

### build.gradle에 서명 설정 추가

`android/app/build.gradle`에 추가:

```gradle
android {
    ...
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            def keystoreProperties = new Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## 📱 Google Play Console 준비

### 1. Google Play Console 계정

- [Google Play Console](https://play.google.com/console) 접속
- Google Play Developer 계정 생성 ($25 일회성 등록비)

### 2. 앱 등록

1. **앱 만들기** 클릭
2. **앱 이름**: `단단이` 또는 `Dandani`
3. **기본 언어**: 한국어
4. **앱 또는 게임**: 앱
5. **무료 또는 유료**: 무료

### 3. 필수 정보 입력

#### 앱 세부정보
- **앱 이름**: `단단이`
- **간단한 설명**: (최대 80자)
- **전체 설명**: (최대 4000자)
- **앱 아이콘**: 512x512 PNG (이미 준비됨)
- **기능 그래픽**: (선택사항)
- **스크린샷**: 최소 2개 (권장: 4-8개)

#### 스크린샷 크기
- **Phone**: 1080 x 1920 이상
- **7-inch Tablet**: 1200 x 1920 이상
- **10-inch Tablet**: 1600 x 2560 이상

#### 카테고리
- **앱 카테고리**: 건강 및 피트니스, 라이프스타일 등

#### 콘텐츠 등급
- 앱 콘텐츠에 맞는 등급 선택

#### 개인정보 보호
- **개인정보 보호 정책 URL**: (필요시)
- **데이터 안전**: 데이터 수집 여부에 따라 설정

## 📤 AAB 업로드

### 1. 내부 테스트 트랙

1. Google Play Console > 앱 선택
2. **출시** > **프로덕션** 또는 **내부 테스트**
3. **새 버전 만들기**
4. **AAB 파일 업로드** (`app-release.aab`)
5. **릴리스 노트** 작성
6. **검토 제출**

### 2. 프로덕션 출시

1. 내부 테스트 완료 후
2. **프로덕션** 트랙으로 승격
3. **검토 제출**

## 🧪 테스트

### 로컬 테스트

```bash
# APK 설치 (실제 기기)
adb install app/build/outputs/apk/release/app-release.apk

# 또는 Android Studio에서 직접 실행
```

### 내부 테스트

1. Google Play Console에서 내부 테스트 트랙 생성
2. 테스터 이메일 추가
3. AAB 업로드 및 검토 제출
4. 테스터에게 테스트 링크 공유

## 📋 체크리스트

### 빌드 전
- [ ] 웹 앱 빌드 완료 (`npm run build`)
- [ ] Capacitor 동기화 완료 (`npx cap sync android`)
- [ ] 앱 아이콘 확인
- [ ] 스플래시 이미지 확인
- [ ] 버전 코드/이름 확인

### 서명 설정
- [ ] 키스토어 생성
- [ ] keystore.properties 설정
- [ ] build.gradle 서명 설정 추가

### Google Play Console
- [ ] Google Play Developer 계정 생성
- [ ] 앱 등록
- [ ] 앱 세부정보 입력
- [ ] 스크린샷 준비
- [ ] 개인정보 보호 정책 (필요시)

### 배포
- [ ] Release AAB 빌드
- [ ] 내부 테스트 업로드
- [ ] 테스트 완료
- [ ] 프로덕션 출시

## 🐛 문제 해결

### 빌드 오류

```bash
# Gradle 캐시 정리
cd android
./gradlew clean

# 다시 빌드
./gradlew bundleRelease
```

### 서명 오류

- 키스토어 파일 경로 확인
- keystore.properties 파일 확인
- 키스토어 비밀번호 확인

### 업로드 오류

- AAB 파일 크기 확인 (최대 150MB)
- 버전 코드 증가 확인
- 서명 확인

## 📝 다음 단계

1. ✅ **웹 앱 빌드 및 동기화**
2. ✅ **Android Studio에서 프로젝트 열기**
3. ✅ **서명 설정**
4. ✅ **Release AAB 빌드**
5. ✅ **Google Play Console에 업로드**
6. ✅ **내부 테스트**
7. ✅ **프로덕션 출시**
