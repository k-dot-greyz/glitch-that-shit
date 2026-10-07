/**
 * Progressive e2e artifact mint.
 *
 * Every step transition rewrites report.json (temp file, then rename) and
 * appends one line to events.jsonl. A killed run still leaves the last good
 * report. Mint failures are recorded and logged; they never throw.
 */
import { appendFile, mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function now() {
  return new Date().toISOString();
}

function messageOf(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function createRun(dir) {
  const state = {
    schema: 'gts.e2e/1',
    status: 'running',
    startedAt: now(),
    finishedAt: null,
    steps: [],
    mintErrors: [],
  };

  const reportPath = join(dir, 'report.json');
  const jsonlPath = join(dir, 'events.jsonl');

  async function mint(event) {
    try {
      await mkdir(dir, { recursive: true });
      await appendFile(jsonlPath, `${JSON.stringify({ t: now(), ...event })}\n`);
      const tmp = join(dir, `.report.${process.pid}.json`);
      await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`);
      await rename(tmp, reportPath);
    } catch (err) {
      const message = messageOf(err);
      state.mintErrors.push({ at: now(), message });
      console.error(`[e2e] artifact mint failed: ${message}`);
    }
  }

  function upsert(id) {
    let step = state.steps.find((s) => s.id === id);
    if (!step) {
      step = { id, status: 'running', level: 'hard' };
      state.steps.push(step);
    }
    return step;
  }

  return {
    get state() {
      return state;
    },
    async begin(id, opts = {}) {
      const step = upsert(id);
      step.status = 'running';
      step.level = opts.level || step.level || 'hard';
      step.title = opts.title || step.title || id;
      step.startedAt = now();
      delete step.error;
      delete step.reason;
      delete step.detail;
      await mint({ step: id, status: 'running', level: step.level });
      return step;
    },
    async pass(id, detail) {
      const step = upsert(id);
      step.status = 'ok';
      step.finishedAt = now();
      if (detail) step.detail = detail;
      await mint({ step: id, status: 'ok' });
    },
    async fail(id, error) {
      const step = upsert(id);
      step.error = messageOf(error);
      step.finishedAt = now();
      step.status = step.level === 'warn' ? 'warned' : 'failed';
      await mint({ step: id, status: step.status, error: step.error, level: step.level });
    },
    async skip(id, reason) {
      const step = upsert(id);
      if (!step.title) step.title = id;
      step.status = 'skipped';
      step.reason = reason;
      step.finishedAt = now();
      await mint({ step: id, status: 'skipped', reason });
    },
    async finish() {
      state.finishedAt = now();
      const summary = { ok: 0, failed: 0, skipped: 0, warned: 0 };
      for (const step of state.steps) {
        if (step.status === 'ok') summary.ok += 1;
        else if (step.status === 'failed') summary.failed += 1;
        else if (step.status === 'skipped') summary.skipped += 1;
        else if (step.status === 'warned') summary.warned += 1;
      }
      state.summary = summary;
      const hardFailed = state.steps.some((s) => s.status === 'failed' && s.level !== 'soft');
      state.status = hardFailed ? 'failed' : 'passed';
      state.reproduce = 'npm run build && npm run e2e';
      await mint({ event: 'finish', status: state.status, summary });
      return state.status === 'passed' ? 0 : 1;
    },
  };
}
