import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const automationDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(automationDir, '../..');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173';
const shouldStartServer = !process.env.BASE_URL;
// 앱이 부르는 API 주소를 존재하지 않는 테스트 주소로 바꾸고, 그 주소로 가는 요청은 전부
// 아래에서 가로챈다. 예전엔 /api/phrases와 /api/nuv/…만 가로채서 /api/nuv와
// /api/analytics/event가 운영 Worker로 나갔다 — CI가 돌 때마다 운영 D1에 방문이 남았다.
const TEST_API_ORIGIN = 'http://dandani-api.e2e.invalid';
let server;

try {
  if (shouldStartServer) {
    server = spawn('npm', ['run', 'start:frontend'], {
      cwd: repositoryRoot,
      env: {
        ...process.env, BROWSER: 'none', PORT: '4173',
        REACT_APP_API_URL: TEST_API_ORIGIN, REACT_APP_POSTHOG_KEY: '',
      },
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

  const productionRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('workers.dev')) productionRequests.push(request.url());
  });
  // BASE_URL로 이미 배포된 미리보기를 검사할 때는 API 주소가 다르므로 호스트와 상관없이 가로챈다.
  await page.route('**/api/**', (route) => respondToApi(route, state));
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
  if (productionRequests.length > 0) {
    throw new Error(`Requests reached the production API: ${productionRequests.join('; ')}`);
  }
  await browser.close();
}

async function submitPhrase(page, text) {
  const writeOwnButton = page.getByRole('button', { name: '마음에 드는 게 없나요? 직접 쓸래요' });
  await writeOwnButton.waitFor();
  await writeOwnButton.click();
  await page.getByPlaceholder('예: 행복한 일은 매일 있다고 생각한다').fill(text);
  await page.getByRole('button', { name: '이 문장으로 시작할게요' }).click();
}

async function respondToApi(route, state) {
  const pathname = new URL(route.request().url()).pathname;
  if (pathname === '/api/analytics/event') return fulfill(route, { success: true });
  if (pathname === '/api/nuv') return fulfill(route, { balance: 0 });
  if (pathname.startsWith('/api/phrases')) return respondToPhraseApi(route, state);
  return fulfill(route, { error: 'Unexpected test route' }, 404);
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
