import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { newSchemas } from './helpers.mjs';

// The Miniflare D1 is built from helpers.mjs's list, not from the folder. When a
// migration is added only to schemas/, the suite runs against a database
// production no longer resembles — that is how it fell behind until 2026-10-23.
const FIRST_LISTED = 'schema_v260910_active_phrase_unique.sql';

test('every migration since the phrase rebuild is applied to the test database', async () => {
  const files = (await readdir(new URL('../schemas/', import.meta.url)))
    .filter(name => name.startsWith('schema_v') && name >= FIRST_LISTED)
    .sort();
  assert.deepEqual([...newSchemas].sort(), files);
});
