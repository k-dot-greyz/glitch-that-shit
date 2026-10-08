import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bundleScripts, ENTRIES, manifestFor } from '../../scripts/build.mjs';

describe('esbuild packager', () => {
  it('emits one IIFE per entry with no leftover ESM imports', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gts-bundle-'));
    await bundleScripts(dir);

    for (const name of Object.keys(ENTRIES)) {
      const js = await readFile(join(dir, `${name}.js`), 'utf8');
      expect(js.length).toBeGreaterThan(100);
      expect(js).toContain(`var gts_${name}`);
      expect(js).not.toMatch(/\bimport\s+/);
      expect(js).not.toMatch(/\bexport\s+/);
    }
  });

  it('derives a Firefox manifest without version_name and with gecko id', () => {
    const base = {
      version_name: '0.3.0-rc.1',
      background: { service_worker: 'background.js' },
    };
    const fx = manifestFor('firefox', base);
    expect(fx.version_name).toBeUndefined();
    expect(fx.background).toEqual({ scripts: ['background.js'] });
    expect(fx.browser_specific_settings.gecko.id).toBe('glitch-that-shit@k-dot-greyz');
    expect(base.version_name).toBe('0.3.0-rc.1');
  });
});
