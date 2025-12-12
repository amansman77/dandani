const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// iOS 스플래시 이미지 크기 정의
// iOS는 주로 LaunchScreen.storyboard를 사용하지만, 이미지셋도 지원
const iOSSplashSizes = [
  { width: 1242, height: 2688, filename: 'splash-1242x2688.png' }, // iPhone XS Max, 11 Pro Max
  { width: 1242, height: 2208, filename: 'splash-1242x2208.png' }, // iPhone 6 Plus, 7 Plus, 8 Plus
  { width: 2048, height: 2732, filename: 'splash-2048x2732.png' }, // iPad Pro 12.9"
  { width: 1668, height: 2388, filename: 'splash-1668x2388.png' }, // iPad Pro 11"
  { width: 1536, height: 2048, filename: 'splash-1536x2048.png' }, // iPad Air, iPad Mini
];

// Android 스플래시 이미지 크기 정의 (drawable)
// Capacitor는 drawable-port-* 구조를 사용하므로 기본 drawable과 함께 생성
const androidSplashSizes = [
  // 기본 drawable (세로 방향)
  { width: 320, height: 480, folder: 'drawable-mdpi', filename: 'splash.png' },      // mdpi
  { width: 480, height: 800, folder: 'drawable-hdpi', filename: 'splash.png' },     // hdpi
  { width: 720, height: 1280, folder: 'drawable-xhdpi', filename: 'splash.png' },    // xhdpi
  { width: 1080, height: 1920, folder: 'drawable-xxhdpi', filename: 'splash.png' }, // xxhdpi
  { width: 1440, height: 2560, folder: 'drawable-xxxhdpi', filename: 'splash.png' }, // xxxhdpi
  // 세로 방향 (portrait)
  { width: 320, height: 480, folder: 'drawable-port-mdpi', filename: 'splash.png' },
  { width: 480, height: 800, folder: 'drawable-port-hdpi', filename: 'splash.png' },
  { width: 720, height: 1280, folder: 'drawable-port-xhdpi', filename: 'splash.png' },
  { width: 1080, height: 1920, folder: 'drawable-port-xxhdpi', filename: 'splash.png' },
  { width: 1440, height: 2560, folder: 'drawable-port-xxxhdpi', filename: 'splash.png' },
];

async function generateSplash(inputPath, outputPath, width, height, backgroundColor = { r: 250, g: 245, b: 233, alpha: 1 }) {
  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover', // 스플래시는 cover로 전체 화면 채움
        background: backgroundColor
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

async function generateiOSSplash(sourceSplash) {
  console.log('\n🍎 iOS 스플래시 이미지 생성 중...\n');
  
  const splashImagesetPath = path.join(__dirname, '../ios/App/App/Assets.xcassets/Splash.imageset');
  
  if (!fs.existsSync(splashImagesetPath)) {
    console.error('❌ iOS Splash.imageset 폴더를 찾을 수 없습니다.');
    return false;
  }

  let successCount = 0;
  for (const splash of iOSSplashSizes) {
    const outputPath = path.join(splashImagesetPath, splash.filename);
    const success = await generateSplash(sourceSplash, outputPath, splash.width, splash.height);
    if (success) successCount++;
  }

  // Contents.json 업데이트
  const contentsPath = path.join(splashImagesetPath, 'Contents.json');
  const contents = {
    images: iOSSplashSizes.map(splash => ({
      filename: splash.filename,
      idiom: 'universal',
      scale: '1x'
    })),
    info: {
      author: 'xcode',
      version: 1
    }
  };
  
  fs.writeFileSync(contentsPath, JSON.stringify(contents, null, 2));
  console.log('✅ Contents.json 업데이트 완료');

  console.log(`\n✅ iOS 스플래시 이미지 생성 완료: ${successCount}/${iOSSplashSizes.length}`);
  return successCount === iOSSplashSizes.length;
}

async function generateAndroidSplash(sourceSplash) {
  console.log('\n🤖 Android 스플래시 이미지 생성 중...\n');
  
  const androidResPath = path.join(__dirname, '../android/app/src/main/res');
  
  if (!fs.existsSync(androidResPath)) {
    console.error('❌ Android res 폴더를 찾을 수 없습니다.');
    return false;
  }

  let successCount = 0;
  for (const splash of androidSplashSizes) {
    const splashPath = path.join(androidResPath, splash.folder);
    
    // 폴더가 없으면 생성
    if (!fs.existsSync(splashPath)) {
      fs.mkdirSync(splashPath, { recursive: true });
    }
    
    const outputPath = path.join(splashPath, splash.filename);
    const success = await generateSplash(sourceSplash, outputPath, splash.width, splash.height);
    if (success) successCount++;
  }

  // 기본 drawable 폴더에도 스플래시 이미지 추가 (styles.xml에서 @drawable/splash 참조)
  const defaultDrawablePath = path.join(androidResPath, 'drawable');
  if (!fs.existsSync(defaultDrawablePath)) {
    fs.mkdirSync(defaultDrawablePath, { recursive: true });
  }
  
  // xxxhdpi 스플래시를 기본 drawable로 복사
  const defaultSplashPath = path.join(defaultDrawablePath, 'splash.png');
  const xxxhdpiSplash = path.join(androidResPath, 'drawable-xxxhdpi', 'splash.png');
  if (fs.existsSync(xxxhdpiSplash)) {
    fs.copyFileSync(xxxhdpiSplash, defaultSplashPath);
    console.log('✅ 기본 drawable/splash.png 생성 완료');
  }

  console.log(`\n✅ Android 스플래시 이미지 생성 완료: ${successCount}/${androidSplashSizes.length}`);
  return successCount === androidSplashSizes.length;
}

async function main() {
  const sourceSplash = path.join(__dirname, '../assets/splash/splash.png');
  
  if (!fs.existsSync(sourceSplash)) {
    console.error('❌ 소스 스플래시 이미지를 찾을 수 없습니다:', sourceSplash);
    console.log('💡 스플래시 이미지를 assets/splash/splash.png에 배치해주세요.');
    process.exit(1);
  }

  console.log('🎨 스플래시 이미지 자동 생성 시작...\n');
  console.log('📁 소스 스플래시:', sourceSplash);

  // iOS만 생성 (Android는 배경색만 사용)
  const iosSuccess = await generateiOSSplash(sourceSplash);

  if (iosSuccess) {
    console.log('\n🎉 iOS 스플래시 이미지 생성 완료!');
    console.log('\n📝 다음 단계:');
    console.log('   1. Xcode에서 Assets.xcassets > Splash 확인');
    console.log('   2. npx cap sync 실행');
    console.log('\n💡 참고: Android는 배경색(#faf5e9)만 사용합니다.');
  } else {
    console.log('\n⚠️  iOS 스플래시 이미지 생성에 실패했습니다.');
    process.exit(1);
  }
}

main().catch(console.error);
