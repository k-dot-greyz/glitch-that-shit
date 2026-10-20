/**
 * scripts/validate-manifest.mjs — permission allow-list + MV3 CSP edges (CONTRIBUTING §5).
 * Attack surface: creeping host_permissions, remote/inline scripts in extension pages.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateManifest } from '../../scripts/validate-manifest.mjs';

const baseChrome = {
  manifest_version: 3,
  name: 'glitch-that-shit',
  version: '0.3.0',
  description: 'test',
  background: { service_worker: 'background.js' },
  action: { default_popup: 'popup.html' },
  options_ui: { page: 'options.html' },
  icons: { '48': 'icons/icon48.png' },
  permissions: ['storage'],
};

async function writeDist(root: string, manifest: Record<string, unknown>): Promise<void> {
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
  for (const f of ['background.js', 'popup.html', 'options.html']) {
    await writeFile(join(root, f), f.endsWith('.html') ? '<!doctype html><html><body></body></html>' : '');
  }
  await mkdir(join(root, 'icons'), { recursive: true });
  await writeFile(join(root, 'icons/icon48.png'), '');
}

describe('validateManifest', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'gts-manifest-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('passes a minimal chrome build layout', async () => {
    await writeDist(dir, baseChrome);
    expect(await validateManifest(dir, 'chrome')).toEqual([]);
  });

  it('rejects permissions outside the allow-list (supply-chain creep)', async () => {
    await writeDist(dir, { ...baseChrome, permissions: ['storage', 'tabs'] });
    const errors = await validateManifest(dir, 'chrome');
    expect(errors.some((e) => e.includes('tabs') && e.includes('allow-list'))).toBe(true);
  });

  it('rejects host_permissions (broad network access)', async () => {
    await writeDist(dir, { ...baseChrome, host_permissions: ['<all_urls>'] });
    expect(await validateManifest(dir, 'chrome')).toContain('host_permissions not expected (content_scripts.matches covers it)');
  });

  it('rejects inline scripts in extension HTML (MV3 CSP)', async () => {
    await writeDist(dir, baseChrome);
    await writeFile(join(dir, 'popup.html'), '<!doctype html><script>alert(1)</script>');
    const errors = await validateManifest(dir, 'chrome');
    expect(errors.some((e) => e.includes('inline <script>'))).toBe(true);
  });

  it('rejects remote script src in extension pages', async () => {
    await writeDist(dir, baseChrome);
    await writeFile(join(dir, 'options.html'), '<!doctype html><script src="https://evil.example/hook.js"></script>');
    const errors = await validateManifest(dir, 'chrome');
    expect(errors.some((e) => e.includes('remote script'))).toBe(true);
  });

  it('flags missing referenced bundle files (broken ship)', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify({ ...baseChrome, background: { service_worker: 'nope.js' } }));
    const errors = await validateManifest(dir, 'chrome');
    expect(errors.some((e) => e.includes('referenced file missing'))).toBe(true);
  });
});
