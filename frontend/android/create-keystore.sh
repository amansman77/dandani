#!/bin/bash

# 키스토어 생성 스크립트
# 사용법: ./create-keystore.sh

KEYSTORE_PATH="app/dandani-release-key.jks"
KEYSTORE_PASSWORD="Ghtjd2025!"
KEY_ALIAS="dandani-key"
KEY_PASSWORD="Ghtjd2025!"

echo "키스토어 생성 중..."
echo "경로: $KEYSTORE_PATH"

# keytool 명령어 실행
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore "$KEYSTORE_PATH" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$KEYSTORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "CN=Dandani Team, OU=Development, O=Yetimates, L=Seoul, ST=Seoul, C=KR"

if [ $? -eq 0 ]; then
    echo "✅ 키스토어 생성 완료: $KEYSTORE_PATH"
    ls -lh "$KEYSTORE_PATH"
else
    echo "❌ 키스토어 생성 실패"
    echo "Java가 설치되어 있는지 확인하세요: java -version"
    exit 1
fi

