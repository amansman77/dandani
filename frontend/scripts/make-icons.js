// 단단이 대표 이미지에서 파비콘·앱 아이콘을 만든다.
//
// 원본은 어두운 별밭 한가운데 빛나는 문양이 있는 정사각형인데, 여백이 넓어서
// 그대로 줄이면 16px 파비콘에서 문양이 점이 된다. 그래서 문양의 밝은 영역을
// 찾아 그 중심을 기준으로 잘라낸다 — 문양이 아이콘의 약 70%를 차지하게 두면
// 안드로이드가 원형으로 깎는 영역(가운데 80%) 안에 안전하게 들어간다.
//
// 배경이 어두워서 투명으로 두면 안 된다. 밝은 테마의 탭 막대에서 문양만 뜨면
// 흰 바탕에 흰 빛이 되어 사라진다. 원본의 어두운 배경을 그대로 살린다.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE = process.argv[2];
const ROOT = path.join(__dirname, '..');
const MASTER = 1024;

// 문양(글로우 포함)이 아이콘에서 차지할 비율. 너무 크면 마스킹에 잘리고,
// 너무 작으면 작은 크기에서 안 보인다.
const EMBLEM_RATIO = 0.69;

async function findEmblem(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: ch } = info;
  const lum = (x, y) => {
    const i = (y * W + x) * ch;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };
  // 모서리 보케는 배경이라 가운데 60%만 본다 — 안 그러면 상자가 이미지 전체가 된다.
  const x0 = Math.round(W * 0.2), x1 = Math.round(W * 0.8);
  const y0 = Math.round(H * 0.2), y1 = Math.round(H * 0.8);
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      if (lum(x, y) > 215) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { W, H, minX, minY, maxX, maxY };
}

// ICO는 PNG를 그대로 품을 수 있다. 헤더 6바이트 + 항목당 16바이트 + PNG 본문.
// 이것 때문에 의존성을 하나 더 들이기엔 형식이 너무 단순하다.
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + pngs.length * 16;
  const entries = [];
  for (const { size, buffer } of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.buffer)]);
}

const write = (file, buffer) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buffer);
  console.log(`  ${path.relative(ROOT, file)}  ${(buffer.length / 1024).toFixed(1)}KB`);
};

async function main() {
  if (!SOURCE || !fs.existsSync(SOURCE)) {
    console.error('원본 이미지 경로를 넘겨주세요.');
    process.exit(1);
  }

  const box = await findEmblem(SOURCE);
  const emblem = Math.max(box.maxX - box.minX, box.maxY - box.minY);
  const side = Math.round(emblem / EMBLEM_RATIO);
  const cx = Math.round((box.minX + box.maxX) / 2);
  const cy = Math.round((box.minY + box.maxY) / 2);
  // 이미지 밖으로 나가지 않게 가둔다.
  const left = Math.max(0, Math.min(box.W - side, Math.round(cx - side / 2)));
  const top = Math.max(0, Math.min(box.H - side, Math.round(cy - side / 2)));
  console.log(`문양 ${emblem}px · 잘라낼 정사각 ${side}px · 좌상단 (${left}, ${top})`);

  const master = await sharp(SOURCE)
    .extract({ left, top, width: side, height: side })
    .resize(MASTER, MASTER, { fit: 'cover' })
    .png()
    .toBuffer();

  const png = (size) => sharp(master).resize(size, size, { fit: 'cover' }).png().toBuffer();
  const webp = (size) => sharp(master).resize(size, size, { fit: 'cover' }).webp({ quality: 92 }).toBuffer();

  console.log('\n웹 파비콘');
  const icoSizes = [16, 32, 48];
  const icoPngs = [];
  for (const size of icoSizes) icoPngs.push({ size, buffer: await png(size) });
  write(path.join(ROOT, 'public/favicon/favicon.ico'), buildIco(icoPngs));
  write(path.join(ROOT, 'public/favicon/favicon-96x96.png'), await png(96));
  write(path.join(ROOT, 'public/favicon/apple-touch-icon.png'), await png(180));
  write(path.join(ROOT, 'public/favicon/web-app-manifest-192x192.png'), await png(192));
  write(path.join(ROOT, 'public/favicon/web-app-manifest-512x512.png'), await png(512));

  console.log('\nPWA 아이콘');
  for (const size of [48, 72, 96, 128, 192, 256, 512]) {
    write(path.join(ROOT, `public/assets/icons/icon-${size}.webp`), await webp(size));
  }

  console.log('\niOS 앱 아이콘');
  const iconSet = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
  const contents = JSON.parse(fs.readFileSync(path.join(iconSet, 'Contents.json'), 'utf8'));
  const done = new Set();
  for (const image of contents.images) {
    if (!image.filename || done.has(image.filename)) continue;
    done.add(image.filename);
    const base = parseFloat(image.size.split('x')[0]);
    const scale = parseInt(image.scale, 10) || 1;
    write(path.join(iconSet, image.filename), await png(Math.round(base * scale)));
  }

  console.log('\n네이티브 빌드용 원본');
  write(path.join(ROOT, 'assets/icon/icon.png'), master);
  write(path.join(ROOT, 'assets/icon.png'), master);
}

main().catch((error) => { console.error(error); process.exit(1); });
