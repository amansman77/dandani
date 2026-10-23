import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'out');
mkdirSync(outDir, { recursive: true });

const SITE_URL = 'https://dandani.yetimates.com';
const consoleErrors = [];
const pageErrors = [];
const failedResponses = [];

const browser = await chromium.launch();
// 실사용자는 한국어 iPhone이다. 언어를 지정하지 않으면 영어 브라우저로 떠서 모든
// 스크린샷 위에 "이 서비스는 한국어로 제공됩니다" 경고가 붙는다.
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'ko-KR' });
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => pageErrors.push(err.message));
page.on('response', (res) => {
  if (res.status() >= 400) failedResponses.push(`${res.status()} ${res.url()}`);
});

await page.goto(SITE_URL, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(outDir, '1-home.png') });

// 처음 온 사람은 스플래시(최대 9초) 뒤에 온보딩을 본다. 예전엔 "건너뛰기"와
// "바로 시작하기"를 곧바로 찾았는데, 스플래시가 덮고 있거나 문구가 바뀌어 아무것도
// 누르지 못했고, 뒤의 스크린샷이 전부 온보딩 화면으로 찍혔다(2026-10-23 확인).
// 온보딩의 "첫 문장 고르기"는 스플래시가 걷힌 뒤에야 눌리므로 그때까지 기다린다.
await page.getByRole('button', { name: '첫 문장 고르기' }).click({ timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(outDir, '2-today.png') });

// 하단 탭은 오늘·기록·엽서다. 오늘 탭은 시작 직후 이미 열려 있어 2-today.png가 대신한다.
// 챌린지 시절엔 /도우미|기록/로 찾았는데, 피벗 뒤로 "도우미" 탭은 없다.
const TAB_SCREENSHOTS = [['기록', '3-history.png'], ['엽서', '4-postcards.png']];
for (const [label, file] of TAB_SCREENSHOTS) {
  await page.getByRole('button', { name: label, exact: true }).click().catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, file) });
}

await browser.close();

console.log(JSON.stringify({
  consoleErrors,
  pageErrors,
  failedResponses,
  screenshotDir: outDir,
}, null, 2));
