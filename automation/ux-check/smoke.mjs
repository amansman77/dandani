import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const automationDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(automationDir, '../..');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173';
const shouldStartServer = !process.env.BASE_URL;
let server;

try {
  if (shouldStartServer) {
    server = spawn('npm', ['run', 'start:frontend'], {
      cwd: repositoryRoot,
      env: { ...process.env, BROWSER: 'none', PORT: '4173' },
      stdio: 'inherit',
    });
    await waitForServer(baseUrl);
  }
  await runSmokeTest();
} finally {
  if (server) server.kill('SIGTERM');
}

async function runSmokeTest() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  const pageErrors = [];
  const state = { phrase: null, rejectCreate: false };

  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/phrases/**', (route) => respondToPhraseApi(route, state));
  await page.route('**/api/phrases', (route) => respondToPhraseApi(route, state));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: '건너뛰기' }).click({ timeout: 10000 });
  await submitPhrase(page, '천천히 해도 괜찮다');
  await page.getByText('천천히 해도 괜찮다', { exact: true }).waitFor();
  await page.getByRole('button', { name: '오늘의 문장 되새기기' }).click();
  await page.getByRole('button', { name: '오늘도 되새겼어요' }).waitFor();

  state.phrase = null;
  state.rejectCreate = true;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await submitPhrase(page, '실패할 문장');
  await page.getByText('test create rejected', { exact: true }).waitFor();

  if (pageErrors.length > 0) throw new Error(`Browser page errors: ${pageErrors.join('; ')}`);
  await browser.close();
}

async function submitPhrase(page, text) {
  await page.getByText('다른 사람들은 이런 문장으로').waitFor();
  await page.getByRole('button', { name: '내 문장을 직접 쓸래요' }).click();
  await page.getByPlaceholder('예: 행복한 일은 매일 있다고 생각한다').fill(text);
  await page.getByRole('button', { name: '이 문장으로 시작할게요' }).click();
}

async function respondToPhraseApi(route, state) {
  const request = route.request();
  const pathname = new URL(request.url()).pathname;
  if (pathname === '/api/phrases/community') return fulfill(route, { items: [] });
  if (pathname === '/api/phrases/active') return fulfill(route, { phrase: state.phrase });
  if (pathname === '/api/phrases' && request.method() === 'POST') {
    if (state.rejectCreate) return fulfill(route, { error: 'test create rejected' }, 400);
    const { phrase: text } = request.postDataJSON();
    state.phrase = {
      id: 'e2e-phrase', phrase: text, status: 'active', logged_days: 0,
      logged_dates: [], logged_today: false, visit_days: 1,
    };
    return fulfill(route, state.phrase);
  }
  if (pathname.endsWith('/log')) {
    state.phrase = { ...state.phrase, logged_days: 1, logged_today: true, logged_dates: [today()] };
    return fulfill(route, { logged_days: 1 });
  }
  return fulfill(route, { error: 'Unexpected test route' }, 404);
}

function fulfill(route, body, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function today() {
  return new Date().toLocaleDateString('en-CA');
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server?.exitCode !== null) throw new Error(`Frontend server exited with ${server.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      // The development server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Frontend server did not become ready: ${url}`);
}
