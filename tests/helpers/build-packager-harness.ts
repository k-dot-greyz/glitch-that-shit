/**
 * ZEN-288 / esbuild packager contract harness (PR #21).
 * Text and JSON parsing only — no extra test deps.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

export function readRepoFile(rel: string): string {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) throw new Error(`missing repo file: ${rel}`);
  return fs.readFileSync(full, 'utf8');
}

export function readPackageJson(): {
  version: string;
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
  engines?: { node?: string };
} {
  return JSON.parse(readRepoFile('package.json'));
}

export function readDependabotYaml(): string {
  return readRepoFile('.github/dependabot.yml');
}

/** Patterns that must not appear in shipped extension JS (supply-chain / dev-only leak). */
export const SHIPPED_BUNDLE_DENYLIST: { id: string; pattern: RegExp }[] = [
  { id: 'node-builtin-import', pattern: /\bfrom\s+['"]node:/ },
  { id: 'require-node', pattern: /\brequire\s*\(\s*['"]node:/ },
  { id: 'esbuild-runtime', pattern: /\besbuild\b/ },
  { id: 'vitest-runtime', pattern: /\bvitest\b/ },
  { id: 'vite-client', pattern: /\bimport\.meta\.hot\b/ },
];

/** Agentic / malformed CLI vectors for build target (path traversal, injection). */
export const MALFORMED_BUILD_TARGET_VECTORS = [
  'evil',
  '../../../tmp/gts-escape',
  'chrome; rm -rf /',
  'chrome\nfirefox',
  '..',
  '',
] as const;
