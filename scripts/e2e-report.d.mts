export interface E2EStep {
  id: string;
  status: 'running' | 'ok' | 'failed' | 'skipped' | 'warned';
  level: 'hard' | 'soft' | 'warn';
  title?: string;
  detail?: string;
  error?: string;
  reason?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface E2ERunState {
  schema: 'gts.e2e/1';
  status: 'running' | 'passed' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  steps: E2EStep[];
  mintErrors: { at: string; message: string }[];
  summary?: { ok: number; failed: number; skipped: number; warned: number };
  reproduce?: string;
}

export interface E2ERun {
  readonly state: E2ERunState;
  begin(id: string, opts?: { level?: E2EStep['level']; title?: string }): Promise<E2EStep>;
  pass(id: string, detail?: string): Promise<void>;
  fail(id: string, error: unknown): Promise<void>;
  skip(id: string, reason: string): Promise<void>;
  finish(): Promise<number>;
}

export function createRun(dir: string): E2ERun;
