const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 이미지 리사이즈 함수
async function resizeImage(inputPath, outputPath, width, height) {
  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 } // 투명 배경
      })
      .png({ quality: 90 })
      .toFile(outputPath);
    
    console.log(`✅ ${path.basename(inputPath)} → ${path.basename(outputPath)} (${width}x${height})`);
  } catch (error) {
    console.error(`❌ ${path.basename(inputPath)} 리사이즈 실패:`, error.message);
  }
}

// 메인 함수
async function main() {
  const inputDir = path.join(__dirname, '../frontend/public/assets/images/dandani-character');
  const outputDir = path.join(__dirname, '../frontend/public/assets/images/dandani-character');
  
  // 출력 디렉토리가 없으면 생성
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const images = [
    { input: '단단이.png', output: '단단이-32x32.png' },
    { input: '뛰는_단단이.png', output: '뛰는_단단이-32x32.png' }
  ];
  
  console.log('🔄 단단이 캐릭터 이미지 리사이즈 시작...\n');
  
  for (const image of images) {
    const inputPath = path.join(inputDir, image.input);
    const outputPath = path.join(outputDir, image.output);
    
    if (fs.existsSync(inputPath)) {
      await resizeImage(inputPath, outputPath, 32, 32);
    } else {
      console.log(`⚠️  파일을 찾을 수 없음: ${image.input}`);
    }
  }
  
  console.log('\n🎉 이미지 리사이즈 완료!');
  console.log('📁 위치:', outputDir);
}

// 스크립트 실행
main().catch(console.error); 