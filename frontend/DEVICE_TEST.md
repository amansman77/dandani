# 실제 기기 테스트 가이드

단단이 iOS 앱을 실제 iPhone에서 테스트하는 방법입니다.

## 📱 준비 사항

### 필수 요구사항

1. **iPhone** (iOS 15.0 이상)
2. **USB 케이블** (Lightning 또는 USB-C)
3. **Apple Developer 계정** (무료 계정도 가능)
4. **Xcode** (최신 버전 권장)

### Apple Developer 계정

- **무료 계정**: 시뮬레이터 및 실제 기기 테스트 가능 (7일 제한)
- **유료 계정 ($99/년)**: App Store 배포, TestFlight, 무제한 테스트

## 🚀 단계별 가이드

### 1단계: iPhone 연결

1. iPhone을 Mac에 USB로 연결
2. iPhone에서 **"이 컴퓨터를 신뢰"** 선택
3. 필요시 iPhone 잠금 해제

### 2단계: Xcode에서 기기 확인

1. Xcode 상단 툴바에서 **기기 선택 메뉴** 클릭
2. 연결된 iPhone이 목록에 표시되는지 확인
   - 표시되지 않으면: iPhone 잠금 해제 또는 케이블 확인

### 3단계: 서명 설정

1. Xcode 왼쪽 프로젝트 네비게이터에서 **App** 프로젝트 선택
2. **TARGETS > App** 선택
3. **Signing & Capabilities** 탭 클릭
4. **Automatically manage signing** 체크
5. **Team** 선택:
   - Apple ID로 로그인 (무료 계정 가능)
   - 또는 Apple Developer 계정 선택

### 4단계: Bundle Identifier 확인

- 현재: `com.yetimates.dandani`
- 변경 필요시: 고유한 식별자로 변경 (예: `com.yourname.dandani`)

### 5단계: 빌드 및 실행

1. Xcode 상단에서 **연결된 iPhone** 선택
2. **`Cmd + R`** 또는 **Run 버튼** 클릭
3. 첫 실행 시 iPhone에서:
   - **설정 > 일반 > VPN 및 기기 관리** 이동
   - 개발자 앱 신뢰 선택
   - **신뢰** 버튼 클릭

### 6단계: 앱 실행 확인

- iPhone에서 앱이 자동으로 실행됨
- 기능 테스트:
  - 챌린지 선택
  - 실천 완료
  - AI 상담사 대화
  - 기록 확인

## ⚠️ 문제 해결

### 기기가 표시되지 않음

```bash
# Xcode 재시작
# 또는
# iPhone 재연결
```

### 서명 오류

```
Error: No signing certificate found
```

**해결 방법:**
1. Xcode > Preferences > Accounts
2. Apple ID 추가/확인
3. Team 선택

### "Untrusted Developer" 오류

iPhone에서:
1. **설정 > 일반 > VPN 및 기기 관리**
2. 개발자 앱 선택
3. **신뢰** 클릭

### 빌드 실패

```bash
# Clean Build
# Xcode: Product > Clean Build Folder (Shift + Cmd + K)

# 또는 명령줄
cd frontend/ios/App
xcodebuild clean
```

## 🔍 테스트 체크리스트

실제 기기에서 확인할 항목:

- [ ] 앱 정상 실행
- [ ] 챌린지 선택 기능
- [ ] 실천 완료 기능
- [ ] AI 상담사 대화
- [ ] 기록 저장 및 조회
- [ ] 네트워크 연결 (API 호출)
- [ ] 로컬 스토리지 (사용자 ID 저장)
- [ ] 화면 회전 대응
- [ ] 키보드 표시/숨김
- [ ] 터치 인터랙션

## 📊 성능 확인

- [ ] 앱 시작 속도
- [ ] 화면 전환 속도
- [ ] API 응답 시간
- [ ] 메모리 사용량
- [ ] 배터리 소모

## 🐛 디버깅

### 로그 확인

1. Xcode 하단 **콘솔** 창 확인
2. 또는 iPhone에서:
   - **설정 > 개인정보 보호 및 보안 > 분석 및 개선**
   - **분석 데이터**에서 앱 로그 확인

### 네트워크 디버깅

```bash
# Charles Proxy 또는
# Proxyman 사용하여 네트워크 트래픽 확인
```

## 📝 테스트 결과 기록

테스트 후 다음 정보를 기록하세요:

- 테스트 기기: iPhone 모델, iOS 버전
- 테스트 날짜:
- 발견된 문제:
- 성능 이슈:
- 개선 사항:

## 🚀 다음 단계

실제 기기 테스트 성공 후:

1. **TestFlight 배포** 준비
2. **앱 아이콘 및 스플래시 스크린** 커스터마이징
3. **App Store 제출** 준비
