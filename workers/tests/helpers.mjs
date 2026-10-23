import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Use the D1 emulator shipped with the installed Wrangler, without a second version.
const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve('wrangler/package.json'));
const { Miniflare } = wranglerRequire('miniflare');
const esbuild = wranglerRequire('esbuild');
const runtimePath = fileURLToPath(new URL('./runtime.mjs', import.meta.url));

// Miniflare does not bundle, and the ledger seal imports CommonJS npm packages
// (@openzeppelin/merkle-tree), so handing it src/ unbundled fails with
// ERR_MODULE_RULE. Bundle once per test file with the same resolution wrangler
// uses for Workers; `npm run check:workers-bundle` still checks the real bundle.
let bundledRuntime;
function bundleRuntime() {
  bundledRuntime ??= esbuild.build({
    entryPoints: [runtimePath],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    mainFields: ['browser', 'module', 'main'],
    conditions: ['workerd', 'worker', 'browser'],
    logLevel: 'silent',
  }).then(result => result.outputFiles[0].text);
  return bundledRuntime;
}
const baseSchemas = [
  'schema_v250923_1.sql', 'schema_v260901_fix_user_events_check.sql',
  'schema_v260828_daily_phrases.sql',
];
// Every migration production has, in the order it was applied. This list stopped
// at 09-18, and while the suite could not load (see bundleRuntime) nobody saw
// that logging a day now needs nuv_accounts — every date test returned 500. A new
// schema file belongs here too — tests/schema-coverage.test.mjs fails without it.
export const newSchemas = [
  'schema_v260910_active_phrase_unique.sql', 'schema_v260910_phrase_replacement.sql',
  'schema_v260917_nuv.sql', 'schema_v260917_nuv_welcome_grant.sql',
  'schema_v260917_postcards.sql', 'schema_v260918_postcard_images.sql',
  'schema_v260922_nuv_accrual.sql',
  'schema_v260923_practice_records.sql', 'schema_v260923_postcard_proof.sql',
  'schema_v260924_drop_postcard_images.sql', 'schema_v260926_practice_logged_days.sql',
  'schema_v260928_nuv_accounts.sql', 'schema_v260928_nuv_anchors.sql',
  'schema_v260928_anchor_postcards.sql', 'schema_v260928_nuv_one_per_day.sql',
  'schema_v260928_postcard_per_phrase_day.sql',
  'schema_v260930_beat_three_days.sql', 'schema_v260930_triumph_background.sql',
];

function splitSqlStatements(sql) {
  const statements = [];
  let currentStatement = '';
  let isTrigger = false;

  for (const rawLine of sql.split('\n')) {
    const line = rawLine.replace(/--.*$/, '').trim();
    if (!line) continue;

    if (!currentStatement && /^CREATE\s+TRIGGER\b/i.test(line)) isTrigger = true;
    currentStatement += `${line}\n`;

    const isComplete = isTrigger ? /^END;$/i.test(line) : line.endsWith(';');
    if (!isComplete) continue;

    statements.push(currentStatement.trim());
    currentStatement = '';
    isTrigger = false;
  }

  if (currentStatement.trim()) statements.push(currentStatement.trim());
  return statements;
}

export async function applySchema(db, name) {
  const sql = await readFile(new URL(`../schemas/${name}`, import.meta.url), 'utf8');
  const statements = splitSqlStatements(sql);
  await db.batch(statements.map(statement => db.prepare(statement)));
}

export async function createApp(t, { migrate = true, token = 'local-test-token', now = '2026-09-10T15:30:00.000Z' } = {}) {
  const outbound = [];
  const mf = new Miniflare({
    modules: true,
    script: await bundleRuntime(),
    scriptPath: runtimePath,
    compatibilityDate: '2024-03-18',
    d1Databases: ['DB'],
    bindings: { ADMIN_API_TOKEN: token, TEST_NOW: now },
    outboundService(request) {
      outbound.push(request.url);
      return new Response('External services are disabled in tests', { status: 503 });
    },
  });
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('DB');
  for (const name of baseSchemas) await applySchema(db, name);
  if (migrate) {
    for (const name of newSchemas) await applySchema(db, name);
  }
  return { db, mf, outbound };
}

export async function request(app, path, options = {}) {
  const { user = 'test-user', body, token, method = body === undefined ? 'GET' : 'POST', timezone = 'Asia/Seoul' } = options;
  const headers = { 'Content-Type': 'application/json', 'X-Client-Timezone': timezone };
  if (user) headers['X-User-ID'] = user;
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await app.mf.dispatchFetch(`http://localhost${path}`, {
    method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}

export async function seedPhrase(db, { id = 'original', user = 'test-user', phrase = '처음 문장' } = {}) {
  await db.prepare(`INSERT INTO daily_phrases (id, user_id, phrase, started_at)
    VALUES (?, ?, ?, '2026-09-01 00:00:00')`).bind(id, user, phrase).run();
}
