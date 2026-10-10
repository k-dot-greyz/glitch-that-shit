#!/usr/bin/env node
/**
 * Build the extension for Chromium (Chrome/Edge/Brave…) and Firefox.
 *
 *   node scripts/build.mjs            → dist/chrome, dist/firefox, dist/*.zip
 *   node scripts/build.mjs --no-zip   → unpacked dirs only
 *   node scripts/build.mjs --target chrome
 *
 * Each TS entry is bundled to a self-contained IIFE with esbuild (content scripts
 * and classic service workers can't use ES module chunks). Output is
 * deterministic: no timestamps, no hashes, sorted zip entries.
 *
 * Vite is not the packager — it stays in package.json only as a Vitest peer.
 */
import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createZip } from './lib/zip.mjs';
import { validateManifest } from './validate-manifest.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const args = process.argv.slice(2);
const noZip = args.includes('--no-zip');
const targetArg = args.includes('--target') ? args[args.indexOf('--target') + 1] : null;
const TARGETS = targetArg ? [targetArg] : ['chrome', 'firefox'];

export const ENTRIES = {
  content: 'src/content.ts',
  background: 'src/background.ts',
  popup: 'src/popup.ts',
  options: 'src/options.ts',
};
const STATIC = [['src/popup.html', 'popup.html'], ['src/options.html', 'options.html'], ['icons', 'icons'], ['LICENSE', 'LICENSE']];

export function manifestFor(target, base) {
  const m = structuredClone(base);
  if (target === 'firefox') {
    delete m.version_name; // unsupported in Firefox
    m.background = { scripts: [base.background.service_worker] };
    m.browser_specific_settings = {
      gecko: {
        id: 'glitch-that-shit@k-dot-greyz',
        strict_min_version: '140.0', // data_collection_permissions support
        data_collection_permissions: { required: ['none'] },
      },
      gecko_android: { strict_min_version: '142.0' },
    };
  }
  return m;
}

async function listFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(p)));
    else out.push(p);
  }
  return out;
}

/** Bundle each MV3 entry to a readable, self-contained IIFE. */
export async function bundleScripts(outDir) {
  await mkdir(outDir, { recursive: true });
  await Promise.all(
    Object.entries(ENTRIES).map(([name, entry]) =>
      esbuild.build({
        absWorkingDir: root,
        entryPoints: [join(root, entry)],
        outfile: join(outDir, `${name}.js`),
        bundle: true,
        format: 'iife',
        globalName: `gts_${name}`,
        platform: 'browser',
        target: 'es2022',
        minify: false, // readable for review (dev-master dex protocol)
        sourcemap: false,
        keepNames: true,
        legalComments: 'none',
        logLevel: 'warning',
      }),
    ),
  );
}

async function main() {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const base = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  if (base.version_name && base.version_name !== pkg.version) {
    throw new Error(`manifest.version_name (${base.version_name}) != package.json version (${pkg.version})`);
  }

  await rm(dist, { recursive: true, force: true });
  const js = join(dist, '.js');
  await bundleScripts(js);

  const summary = [];
  for (const target of TARGETS) {
    const out = join(dist, target);
    await mkdir(out, { recursive: true });
    await cp(js, out, { recursive: true });
    for (const [from, to] of STATIC) await cp(join(root, from), join(out, to), { recursive: true });
    const manifest = manifestFor(target, base);
    await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

    const errors = await validateManifest(out, target);
    if (errors.length) throw new Error(`[${target}] manifest validation failed:\n  - ${errors.join('\n  - ')}`);

    let line = `✓ ${target.padEnd(8)} ${relative(root, out)}/`;
    if (!noZip) {
      const files = await listFiles(out);
      const zip = createZip(await Promise.all(files.map(async (f) => ({ name: relative(out, f).split('\\').join('/'), data: await readFile(f) }))));
      const zipName = `glitch-that-shit-${pkg.version}-${target}.zip`;
      await writeFile(join(dist, zipName), zip);
      const sha = createHash('sha256').update(zip).digest('hex');
      await writeFile(join(dist, `${zipName}.sha256`), `${sha}  ${zipName}\n`);
      line += `  →  dist/${zipName}  (${(zip.length / 1024).toFixed(1)} KB, sha256 ${sha.slice(0, 12)}…)`;
    }
    summary.push(line);
  }
  await rm(js, { recursive: true, force: true });
  console.log(`glitch-that-shit ${pkg.version}\n${summary.join('\n')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
}
