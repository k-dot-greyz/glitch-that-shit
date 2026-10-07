import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRun } from '../../scripts/e2e-report.mjs';

async function readReport(dir: string) {
  return JSON.parse(await readFile(join(dir, 'report.json'), 'utf8')) as {
    status: string;
    steps: { id: string; status: string; error?: string; reason?: string }[];
    summary?: { ok: number; failed: number; skipped: number; warned: number };
    mintErrors: { message: string }[];
  };
}

describe('e2e artifact mint', () => {
  it('rewrites the report after each step so a killed run still has progress', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gts-e2e-'));
    const run = createRun(dir);
    await run.begin('dist', { title: 'Chrome build present' });
    const mid = await readReport(dir);
    expect(mid.status).toBe('running');
    expect(mid.steps[0]?.status).toBe('running');

    await run.pass('dist', 'dist/chrome present');
    const after = await readReport(dir);
    expect(after.steps[0]?.status).toBe('ok');
    const lines = (await readFile(join(dir, 'events.jsonl'), 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1]!).step).toBe('dist');
  });

  it('records a hard failure, skips what depends on it, and exits non-zero', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gts-e2e-'));
    const run = createRun(dir);
    await run.begin('page-glitch');
    await run.fail('page-glitch', new Error('words missing'));
    await run.skip('popup', 'page-glitch failed');
    expect(await run.finish()).toBe(1);
    const report = await readReport(dir);
    expect(report.status).toBe('failed');
    expect(report.steps.find((s) => s.id === 'popup')?.status).toBe('skipped');
    expect(report.steps.find((s) => s.id === 'popup')?.reason).toBe('page-glitch failed');
    expect(report.summary).toEqual({ ok: 0, failed: 1, skipped: 1, warned: 0 });
  });

  it('treats a warn as non-blocking', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gts-e2e-'));
    const run = createRun(dir);
    await run.begin('screenshot', { level: 'warn', title: 'page screenshot' });
    await run.fail('screenshot', 'capture timed out');
    expect(await run.finish()).toBe(0);
    const report = await readReport(dir);
    expect(report.status).toBe('passed');
    expect(report.steps[0]?.status).toBe('warned');
    expect(report.summary?.warned).toBe(1);
  });

  it('swallows mint errors when the artifact path is not a directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gts-e2e-'));
    const blocker = join(dir, 'not-a-dir');
    await writeFile(blocker, 'x');
    const run = createRun(join(blocker, 'child'));
    await expect(run.begin('dist')).resolves.toMatchObject({ id: 'dist', status: 'running' });
    expect(run.state.mintErrors.length).toBeGreaterThan(0);
    expect(run.state.mintErrors[0]?.message).toBeTruthy();
  });
});
