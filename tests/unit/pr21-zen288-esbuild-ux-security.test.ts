/**
 * GT-PR21-* — UX/DX + security stories for merged PR #21 (esbuild packager + ZEN-288 pins).
 * Linked feat: https://github.com/k-dot-greyz/glitch-that-shit/pull/21
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertPackageManifestVersions,
  bundleScripts,
  manifestFor,
  resolveBuildTargets,
} from '../../scripts/build.mjs';
import {
  MALFORMED_BUILD_TARGET_VECTORS,
  readDependabotYaml,
  readPackageJson,
  readRepoFile,
  SHIPPED_BUNDLE_DENYLIST,
} from '../helpers/build-packager-harness';

const execFileAsync = promisify(execFile);

async function listJsFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...(await listJsFiles(p)));
    else if (name.name.endsWith('.js')) out.push(p);
  }
  return out;
}

describe('GT-PR21 — contributor UX (happy path)', () => {
  it('GT-PR21-01: esbuild is the direct packager; build scripts invoke build.mjs only', () => {
    const pkg = readPackageJson();
    expect(pkg.devDependencies.esbuild).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.scripts.build).toBe('node scripts/build.mjs');
    expect(pkg.scripts['build:chrome']).toContain('build.mjs');
    const buildSrc = readRepoFile('scripts/build.mjs');
    expect(buildSrc).toMatch(/import \* as esbuild from 'esbuild'/);
    expect(buildSrc).not.toMatch(/from\s+['"]vite['"]/);
  });

  it('GT-PR21-02: CI reads Node from .nvmrc (DX parity with CONTRIBUTING)', () => {
    const nvmrc = readRepoFile('.nvmrc').trim();
    const ci = readRepoFile('.github/workflows/ci.yml');
    expect(nvmrc).toBe('24');
    expect(ci).toMatch(/node-version-file:\s*\.nvmrc/);
    expect(readPackageJson().engines?.node).toContain('22.12');
  });

  it('GT-PR21-03: dependabot groups packager vs test-runner and freezes esbuild majors', () => {
    const yaml = readDependabotYaml();
    expect(yaml).toMatch(/groups:\s*\n\s*packager:/);
    expect(yaml).toMatch(/patterns:\s*\n\s*-\s*esbuild/);
    expect(yaml).toMatch(/test-runner:/);
    expect(yaml).toMatch(/dependency-name:\s*esbuild[\s\S]*version-update:semver-major/);
  });

  it('GT-PR21-04: default build targets are chrome + firefox only', () => {
    expect(resolveBuildTargets(null)).toEqual(['chrome', 'firefox']);
    expect(resolveBuildTargets('chrome')).toEqual(['chrome']);
    expect(resolveBuildTargets('firefox')).toEqual(['firefox']);
  });

  it('GT-PR21-05: bundled MV3 entries stay self-contained IIFEs (esbuild contract)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gts-pr21-bundle-'));
    await bundleScripts(dir);
    for (const file of await listJsFiles(dir)) {
      const js = await readFile(file, 'utf8');
      for (const rule of SHIPPED_BUNDLE_DENYLIST) {
        expect(js, `${rule.id} in ${file}`).not.toMatch(rule.pattern);
      }
      expect(js).not.toMatch(/\bimport\s+/);
      expect(js).not.toMatch(/\bexport\s+/);
    }
  });
});

describe('GT-PR21 — security & graceful ablation (sad path)', () => {
  it('GT-PR21-06: rejects agentic / malformed --target (path traversal & unknown flavours)', () => {
    for (const vector of MALFORMED_BUILD_TARGET_VECTORS) {
      expect(() => resolveBuildTargets(vector)).toThrow(/Unknown --target/);
    }
  });

  it('GT-PR21-07: CLI --target path traversal cannot escape dist/ (subprocess guard)', async () => {
    await expect(
      execFileAsync('node', ['scripts/build.mjs', '--no-zip', '--target', '../../../tmp/gts-pr21-escape'], {
        cwd: process.cwd(),
      }),
    ).rejects.toMatchObject({ code: 1 });
  });

  it('GT-PR21-08: version_name drift fails closed before bundling', () => {
    expect(() =>
      assertPackageManifestVersions({ version: '0.3.0-rc.1' }, { version_name: '9.9.9-evil' }),
    ).toThrow(/version_name/);
    expect(() =>
      assertPackageManifestVersions({ version: '0.3.0-rc.1' }, { version_name: '0.3.0-rc.1' }),
    ).not.toThrow();
  });

  it('GT-PR21-09: manifestFor does not mutate chromium base (wrong-target ablation)', () => {
    const base = {
      version_name: '0.3.0-rc.1',
      background: { service_worker: 'background.js' },
    };
    const chrome = manifestFor('chrome', base);
    expect(chrome.version_name).toBe('0.3.0-rc.1');
    expect(chrome.background).toEqual({ service_worker: 'background.js' });
    expect(chrome.browser_specific_settings).toBeUndefined();
  });

  it('GT-PR21-10: importing build.mjs as a module does not run the CLI (side-effect ablation)', async () => {
    const mod = await import('../../scripts/build.mjs');
    expect(typeof mod.bundleScripts).toBe('function');
    expect(typeof mod.resolveBuildTargets).toBe('function');
  });
});
