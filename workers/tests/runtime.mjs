import worker from '../src/index.js';

// Freeze only the test worker's clock. SQLite timestamps are set explicitly in fixtures.
const NativeDate = Date;
let currentTime = '2026-09-10T15:30:00.000Z';
globalThis.Date = class extends NativeDate {
  constructor(...args) {
    super(...(args.length ? args : [currentTime]));
  }
  static now() { return NativeDate.parse(currentTime); }
};
// Each Miniflare instance owns its clock; production never reads this binding.
export default {
  fetch(request, env) {
    currentTime = env.TEST_NOW;
    return worker.fetch(request, env);
  },
};
