const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// iOS 아이콘 크기 정의
const iOSIconSizes = [
  { size: 20, scale: 2, filename: 'AppIcon-20@2x.png' },      // 40x40
  { size: 20, scale: 3, filename: 'AppIcon-20@3x.png' },      // 60x60
  { size: 29, scale: 2, filename: 'AppIcon-29@2x.png' },      // 58x58
  { size: 29, scale: 3, filename: 'AppIcon-29@3x.png' },      // 87x87
  { size: 40, scale: 1, filename: 'AppIcon-40.png' },          // 40x40
  { size: 40, scale: 2, filename: 'AppIcon-40@2x.png' },      // 80x80
  { size: 40, scale: 3, filename: 'AppIcon-40@3x.png' },      // 120x120
  { size: 60, scale: 2, filename: 'AppIcon-60@2x.png' },      // 120x120
  { size: 60, scale: 3, filename: 'AppIcon-60@3x.png' },      // 180x180
  { size: 76, scale: 1, filename: 'AppIcon-76.png' },         // 76x76
  { size: 76, scale: 2, filename: 'AppIcon-76@2x.png' },    // 152x152
  { size: 83.5, scale: 2, filename: 'AppIcon-83.5@2x.png' }, // 167x167
  { size: 1024, scale: 1, filename: 'AppIcon-1024.png' }     // 1024x1024
];

// Android 아이콘 크기 정의
// 참고: mipmap-playstore는 유효한 리소스 디렉토리가 아니므로 제외
// Play Store용 512x512 아이콘은 Google Play Console에서 직접 업로드
const androidIconSizes = [
  { size: 48, folder: 'mipmap-mdpi', filename: 'ic_launcher.png' },
  { size: 72, folder: 'mipmap-hdpi', filename: 'ic_launcher.png' },
  { size: 96, folder: 'mipmap-xhdpi', filename: 'ic_launcher.png' },
  { size: 144, folder: 'mipmap-xxhdpi', filename: 'ic_launcher.png' },
  { size: 192, folder: 'mipmap-xxxhdpi', filename: 'ic_launcher.png' }
];

async function generateIcon(inputPath, outputPath, width, height) {
  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'contain',
        background: { r: 250, g: 245, b: 233, alpha: 1 } // #faf5e9
      })
      .png()
      .toFile(outputPath);
    
    console.log(`✅ ${path.basename(outputPath)} (${width}x${height})`);
    return true;
  } catch (error) {
    console.error(`❌ ${path.basename(outputPath)} 생성 실패:`, error.message);
    return false;
  }
}

async function generateiOSIcons(sourceIcon) {
  console.log('\n🍎 iOS 아이콘 생성 중...\n');
  
  const iosIconPath = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');
  
  if (!fs.existsSync(iosIconPath)) {
    console.error('❌ iOS AppIcon.appiconset 폴더를 찾을 수 없습니다.');
    return false;
  }

  let successCount = 0;
  for (const icon of iOSIconSizes) {
    const actualSize = Math.round(icon.size * icon.scale);
    const outputPath = path.join(iosIconPath, icon.filename);
    const success = await generateIcon(sourceIcon, outputPath, actualSize, actualSize);
    if (success) successCount++;
  }

  console.log(`\n✅ iOS 아이콘 생성 완료: ${successCount}/${iOSIconSizes.length}`);
  return successCount === iOSIconSizes.length;
}

async function generateAdaptiveIcon(sourceIcon, size, outputDir) {
  // 적응형 아이콘: foreground는 아이콘, background는 단색 배경
  const foregroundPath = path.join(outputDir, 'ic_launcher_foreground.png');
  const backgroundPath = path.join(outputDir, 'ic_launcher_background.png');
  
  // Foreground: 아이콘을 중앙에 배치 (안전 영역 고려)
  const safeSize = Math.round(size * 0.7); // 70% 안전 영역
  const padding = Math.round((size - safeSize) / 2);
  
  await sharp(sourceIcon)
    .resize(safeSize, safeSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } // 투명 배경
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(foregroundPath);
  
  // Background: 단색 배경 (#faf5e9)
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 250, g: 245, b: 233, alpha: 1 } // #faf5e9
    }
  })
    .png()
    .toFile(backgroundPath);
  
  return true;
}

async function generateAndroidIcons(sourceIcon) {
  console.log('\n🤖 Android 아이콘 생성 중...\n');
  
  const androidResPath = path.join(__dirname, '../android/app/src/main/res');
  
  if (!fs.existsSync(androidResPath)) {
    console.error('❌ Android res 폴더를 찾을 수 없습니다.');
    return false;
  }

  let successCount = 0;
  
  // 기본 런처 아이콘 생성
  for (const icon of androidIconSizes) {
    const iconPath = path.join(androidResPath, icon.folder);
    
    // 폴더가 없으면 생성
    if (!fs.existsSync(iconPath)) {
      fs.mkdirSync(iconPath, { recursive: true });
    }
    
    const outputPath = path.join(iconPath, icon.filename);
    const success = await generateIcon(sourceIcon, outputPath, icon.size, icon.size);
    if (success) successCount++;
    
    // 적응형 아이콘 생성 (Android 8.0+) - 모든 밀도에 대해
    try {
      await generateAdaptiveIcon(sourceIcon, icon.size, iconPath);
      console.log(`✅ 적응형 아이콘 생성: ${icon.folder}`);
    } catch (error) {
      console.error(`❌ 적응형 아이콘 생성 실패 (${icon.folder}):`, error.message);
    }
  }

  console.log(`\n✅ Android 아이콘 생성 완료: ${successCount}/${androidIconSizes.length}`);
  return successCount === androidIconSizes.length;
}

// 웹 앱용 아이콘 크기 정의
const webIconSizes = [
  { size: 48, filename: 'icon-48.webp' },
  { size: 72, filename: 'icon-72.webp' },
  { size: 96, filename: 'icon-96.webp' },
  { size: 128, filename: 'icon-128.webp' },
  { size: 192, filename: 'icon-192.webp' },
  { size: 256, filename: 'icon-256.webp' },
  { size: 512, filename: 'icon-512.webp' }
];

async function generateWebIcons(sourceIcon) {
  console.log('\n🌐 웹 앱 아이콘 생성 중...\n');
  
  const webIconsPath = path.join(__dirname, '../public/assets/icons');
  
  if (!fs.existsSync(webIconsPath)) {
    fs.mkdirSync(webIconsPath, { recursive: true });
  }

  let successCount = 0;
  for (const icon of webIconSizes) {
    const outputPath = path.join(webIconsPath, icon.filename);
    try {
      await sharp(sourceIcon)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 250, g: 245, b: 233, alpha: 1 } // #faf5e9
        })
        .webp({ quality: 90 })
        .toFile(outputPath);
      
      console.log(`✅ ${icon.filename} (${icon.size}x${icon.size})`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${icon.filename} 생성 실패:`, error.message);
    }
  }

  console.log(`\n✅ 웹 앱 아이콘 생성 완료: ${successCount}/${webIconSizes.length}`);
  return successCount === webIconSizes.length;
}

async function main() {
  const sourceIcon = path.join(__dirname, '../assets/icon/icon.png');
  
  if (!fs.existsSync(sourceIcon)) {
    console.error('❌ 소스 아이콘을 찾을 수 없습니다:', sourceIcon);
    console.log('💡 1024x1024 PNG 아이콘을 assets/icon/icon.png에 배치해주세요.');
    process.exit(1);
  }

  console.log('🎨 앱 아이콘 자동 생성 시작...\n');
  console.log('📁 소스 아이콘:', sourceIcon);

  const iosSuccess = await generateiOSIcons(sourceIcon);
  const androidSuccess = await generateAndroidIcons(sourceIcon);
  const webSuccess = await generateWebIcons(sourceIcon);

  if (iosSuccess && androidSuccess && webSuccess) {
    console.log('\n🎉 모든 아이콘 생성 완료!');
    console.log('\n📝 다음 단계:');
    console.log('   1. Xcode에서 Assets.xcassets > AppIcon 확인');
    console.log('   2. Android Studio에서 res 폴더의 아이콘 확인');
    console.log('   3. npx cap sync 실행');
  } else {
    console.log('\n⚠️  일부 아이콘 생성에 실패했습니다.');
    if (!iosSuccess) console.log('   - iOS 아이콘 생성 실패');
    if (!androidSuccess) console.log('   - Android 아이콘 생성 실패');
    if (!webSuccess) console.log('   - 웹 앱 아이콘 생성 실패');
    process.exit(1);
  }
}

main().catch(console.error);
