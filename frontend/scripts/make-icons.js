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

// Android는 res/mipmap-anydpi-v26/ic_launcher.xml이 배경·전경 두 장을 16.7%씩 안으로 들여
// 겹친 뒤 기기 모양(원·둥근 사각)으로 깎는다. 예전 generate-icons.js는 전경을 투명 배경에
// 70%로 줄이고 배경을 크림색(#faf5e9)으로 깔았다 — 옛 아이콘엔 맞았지만 이 문양은 어두운
// 별밭째로 한 장이라, 그렇게 하면 크림 테두리 안에 어두운 사각형이 뜬다. 그래서 전경은
// 잘라낸 원본 그대로, 배경은 원본 모서리의 어두운 색으로 채운다. 문양은 이미 원본의 69%라
// 깎이는 영역 안에 들어간다. 7.x 이하 기기용 ic_launcher·ic_launcher_round도 같이 만든다.
const ANDROID_DENSITIES = [
  ['mipmap-mdpi', 48], ['mipmap-hdpi', 72], ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144], ['mipmap-xxxhdpi', 192],
];

async function cornerColor(master) {
  const { data, info } = await sharp(master).resize(32, 32).raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => (y * info.width + x) * info.channels;
  const corners = [at(0, 0), at(31, 0), at(0, 31), at(31, 31)];
  const mean = (offset) => Math.round(corners.reduce((sum, i) => sum + data[i + offset], 0) / corners.length);
  return { r: mean(0), g: mean(1), b: mean(2), alpha: 1 };
}

async function writeAndroidIcons(master) {
  const background = await cornerColor(master);
  const res = path.join(ROOT, 'android/app/src/main/res');
  for (const [folder, size] of ANDROID_DENSITIES) {
    const square = await sharp(master).resize(size, size, { fit: 'cover' }).png().toBuffer();
    const circle = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`
    );
    const round = await sharp(square).composite([{ input: circle, blend: 'dest-in' }]).png().toBuffer();
    const fill = await sharp({ create: { width: size, height: size, channels: 4, background } }).png().toBuffer();
    write(path.join(res, folder, 'ic_launcher.png'), square);
    write(path.join(res, folder, 'ic_launcher_round.png'), round);
    write(path.join(res, folder, 'ic_launcher_foreground.png'), square);
    write(path.join(res, folder, 'ic_launcher_background.png'), fill);
  }
}

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

  console.log('\nAndroid 앱 아이콘');
  await writeAndroidIcons(master);

  console.log('\n네이티브 빌드용 원본');
  write(path.join(ROOT, 'assets/icon/icon.png'), master);
  write(path.join(ROOT, 'assets/icon.png'), master);
}

main().catch((error) => { console.error(error); process.exit(1); });
