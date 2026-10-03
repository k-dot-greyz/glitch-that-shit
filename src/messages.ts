/**
 * Typed cross-context messages (CONTRIBUTING §3.3 "open piping").
 * Settings themselves flow through chrome.storage.onChanged; messages are
 * only for per-tab runtime status.
 */

export type Message =
  | { type: 'gts:hits'; count: number } // content → background (badge)
  | { type: 'gts:status' }; // popup → content

export interface StatusResponse {
  hits: number;
  active: boolean;
  host: string;
}

export function isMessage(m: unknown): m is Message {
  if (typeof m !== 'object' || m === null) return false;
  const t = (m as { type?: unknown }).type;
  if (t === 'gts:hits') return Number.isFinite((m as { count?: unknown }).count);
  return t === 'gts:status';
}
