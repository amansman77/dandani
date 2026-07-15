import { chromium } from 'playwright';
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
const page = await browser.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => pageErrors.push(err.message));
page.on('response', (res) => {
  if (res.status() >= 400) failedResponses.push(`${res.status()} ${res.url()}`);
});

await page.goto(SITE_URL, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(outDir, '1-home.png') });

const skipButton = page.getByText(/건너뛰기|스킵|skip/i).first();
if (await skipButton.isVisible().catch(() => false)) {
  await skipButton.click();
  await page.waitForTimeout(500);
}

const startButton = page.getByText(/바로 시작하기|시작하기/i).first();
if (await startButton.isVisible().catch(() => false)) {
  await startButton.click();
  await page.waitForTimeout(1000);
}
await page.screenshot({ path: path.join(outDir, '2-after-challenge-select.png') });

const tabs = await page.locator('[role="tab"], button').filter({ hasText: /오늘|도우미|기록/ }).all();
for (let i = 0; i < tabs.length; i += 1) {
  await tabs[i].click().catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, `3-tab-${i}.png`) });
}

await browser.close();

console.log(JSON.stringify({
  consoleErrors,
  pageErrors,
  failedResponses,
  screenshotDir: outDir,
}, null, 2));
