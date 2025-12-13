#!/bin/bash

# Android AAB 빌드 스크립트
# Android Studio의 JDK를 사용하여 빌드합니다

export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"

echo "🚀 Android AAB 빌드 시작..."
echo "Java 경로: $JAVA_HOME"

cd "$(dirname "$0")"

# Gradle 캐시 정리
echo "📦 Gradle 캐시 정리 중..."
./gradlew clean

# AAB 파일 생성
echo "🔨 AAB 파일 생성 중..."
./gradlew bundleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 빌드 성공!"
    echo "📦 AAB 파일 위치:"
    ls -lh app/build/outputs/bundle/release/app-release.aab
else
    echo ""
    echo "❌ 빌드 실패"
    exit 1
fi
