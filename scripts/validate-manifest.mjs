#!/usr/bin/env node
/**
 * Offline MV3 manifest checks for a built extension directory:
 * required keys, version format, permission allow-list, and that every file
 * the manifest references actually exists.
 *
 *   node scripts/validate-manifest.mjs dist/chrome chrome
 */
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Anything outside this list must be justified in the PR (CONTRIBUTING §5).
const ALLOWED_PERMISSIONS = new Set(['storage', 'contextMenus', 'activeTab']);

const exists = (p) => access(p).then(() => true, () => false);

export async function validateManifest(dir, target) {
  const errors = [];
  let m;
  try {
    m = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  } catch (e) {
    return [`manifest.json unreadable: ${e.message}`];
  }
  if (m.manifest_version !== 3) errors.push('manifest_version must be 3');
  for (const k of ['name', 'version', 'description']) if (!m[k]) errors.push(`missing "${k}"`);
  if (m.name && m.name.length > 75) errors.push('name longer than 75 chars');
  if (m.description && m.description.length > 132) errors.push(`description is ${m.description.length} chars (max 132)`);
  if (!/^\d{1,5}(\.\d{1,5}){0,3}$/.test(m.version ?? '')) errors.push(`version "${m.version}" must be 1–4 dot-separated integers`);
  if (target === 'firefox' && m.version_name) errors.push('version_name is not supported by Firefox');

  for (const p of [...(m.permissions ?? []), ...(m.optional_permissions ?? [])]) {
    if (!ALLOWED_PERMISSIONS.has(p)) errors.push(`permission "${p}" not in allow-list`);
  }
  if (m.host_permissions?.length) errors.push('host_permissions not expected (content_scripts.matches covers it)');
  if (m.content_security_policy) errors.push('custom content_security_policy not expected');

  if (target === 'chrome' && !m.background?.service_worker) errors.push('chrome: background.service_worker required');
  if (target === 'firefox') {
    if (!m.background?.scripts?.length) errors.push('firefox: background.scripts required');
    if (!m.browser_specific_settings?.gecko?.id) errors.push('firefox: browser_specific_settings.gecko.id required');
  }

  const files = [
    m.background?.service_worker,
    ...(m.background?.scripts ?? []),
    m.action?.default_popup,
    m.options_ui?.page,
    ...Object.values(m.icons ?? {}),
    ...Object.values(m.action?.default_icon ?? {}),
    ...(m.content_scripts ?? []).flatMap((c) => [...(c.js ?? []), ...(c.css ?? [])]),
  ].filter(Boolean);
  for (const f of new Set(files)) if (!(await exists(join(dir, f)))) errors.push(`referenced file missing: ${f}`);

  const commands = Object.keys(m.commands ?? {});
  const withKeys = commands.filter((c) => m.commands[c].suggested_key);
  if (withKeys.length > 4) errors.push('at most 4 commands may have suggested keys');

  for (const page of [m.action?.default_popup, m.options_ui?.page].filter(Boolean)) {
    const html = await readFile(join(dir, page), 'utf8').catch(() => '');
    if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) errors.push(`${page}: inline <script> violates MV3 CSP`);
    for (const [, src] of html.matchAll(/<script[^>]*\bsrc="([^"]+)"/gi)) {
      if (/^(https?:)?\/\//.test(src)) errors.push(`${page}: remote script ${src}`);
      else if (!(await exists(join(dir, src)))) errors.push(`${page}: script missing ${src}`);
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dir, target = 'chrome'] = process.argv.slice(2);
  if (!dir) {
    console.error('usage: validate-manifest.mjs <dir> [chrome|firefox]');
    process.exit(2);
  }
  const errors = await validateManifest(dir, target);
  if (errors.length) {
    console.error(`✗ ${dir}\n  - ${errors.join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`✓ ${dir} (${target}) manifest valid`);
}
