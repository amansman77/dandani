#!/bin/bash
# Xcode 캐시 정리 스크립트

echo "🧹 Xcode 캐시 정리 중..."

# Derived Data 삭제
echo "📦 Derived Data 삭제..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Module Cache 삭제
echo "📦 Module Cache 삭제..."
rm -rf ~/Library/Developer/Xcode/ModuleCache.noindex/*

# Archive 삭제 (선택사항)
# echo "📦 Archive 삭제..."
# rm -rf ~/Library/Developer/Xcode/Archives/*

echo "✅ Xcode 캐시 정리 완료!"
echo ""
echo "다음 단계:"
echo "1. Xcode 완전 종료"
echo "2. npm run cap:ios 로 Xcode 다시 열기"
echo "3. Product > Clean Build Folder (Shift + Cmd + K)"
echo "4. 다시 빌드"
