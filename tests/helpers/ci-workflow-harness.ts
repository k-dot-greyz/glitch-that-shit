/**
 * CI workflow contract harness — parses workflow YAML as text for deterministic checks.
 */

import fs from 'node:fs';
import path from 'node:path';

const WORKFLOW_DIR = path.join(process.cwd(), '.github/workflows');

export const UPLOAD_ARTIFACT_V7_0_2_SHA = 'cf430e030ddbb5b0abf93d22962f4752f3646cd9';

export function readWorkflowFile(filename: string): string {
  const full = path.join(WORKFLOW_DIR, filename);
  if (!fs.existsSync(full)) {
    throw new Error(`missing workflow file: ${full}`);
  }
  return fs.readFileSync(full, 'utf8');
}

/** Permissions block under workflow root (two-space indent). */
export function parseWorkflowPermissions(workflowYaml: string): Record<string, string> {
  const perms: Record<string, string> = {};
  const blockMatch = workflowYaml.match(/^permissions:\n((?:  [\w-]+: .+\n)+)/m);
  if (!blockMatch) {
    return perms;
  }
  for (const line of blockMatch[1].split('\n')) {
    const m = line.match(/^\s{2}([\w-]+):\s+(\S+)/);
    if (m) {
      perms[m[1]] = m[2];
    }
  }
  return perms;
}

/** Each `uses: actions/upload-artifact@…` step block (includes following `with:` lines). */
export function extractUploadArtifactStepBlocks(workflowYaml: string): string[] {
  const blocks: string[] = [];
  const re = /- uses: actions\/upload-artifact@[^\n]+\n(?:        [^\n]+\n)*/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(workflowYaml)) !== null) {
    blocks.push(match[0]);
  }
  return blocks;
}

export function parseArtifactPathLines(stepBlock: string): string[] {
  const pathIdx = stepBlock.indexOf('path:');
  if (pathIdx === -1) {
    return [];
  }
  const after = stepBlock.slice(pathIdx);
  const pipeMatch = after.match(/path:\s*\|\s*\n((?:\s+.+\n)+)/);
  if (!pipeMatch) {
    const inline = after.match(/path:\s*(\S+)/);
    return inline ? [inline[1].trim()] : [];
  }
  return pipeMatch[1]
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function stepUsesPinnedFullSha(stepBlock: string): boolean {
  const m = stepBlock.match(/uses: actions\/upload-artifact@([0-9a-f]{40})/i);
  return Boolean(m);
}

export const AGENTIC_WORKFLOW_INJECTION_PATTERNS: Array<{ id: string; pattern: RegExp; rationale: string }> = [
  {
    id: 'curl-pipe-shell',
    pattern: /curl\s+[^\n|]*\|\s*(ba)?sh\b/i,
    rationale: 'Remote script execution via curl pipe is a common workflow takeover vector.',
  },
  {
    id: 'pr-body-in-run',
    pattern: /run:.*\$\{\{\s*github\.event\.pull_request\.(body|title)\s*\}\}/i,
    rationale: 'Untrusted PR text must not flow into shell run steps (instruction injection).',
  },
  {
    id: 'write-all',
    pattern: /permissions:\s*write-all/i,
    rationale: 'Over-broad token scope increases blast radius on compromised steps.',
  },
  {
    id: 'unpinned-action-main',
    pattern: /uses:\s*[\w./-]+@main\b/i,
    rationale: 'Floating @main action refs are supply-chain drift / takeover targets.',
  },
];

/** Paths that must never be uploaded from CI (secret / dependency exfiltration). */
export const ARTIFACT_PATH_DENYLIST: Array<{ id: string; pattern: RegExp; rationale: string }> = [
  { id: 'env-file', pattern: /\.env\b/i, rationale: 'Environment files may contain API keys.' },
  { id: 'npmrc-auth', pattern: /\.npmrc\b/i, rationale: 'Registry tokens sometimes live in .npmrc.' },
  { id: 'whole-repo', pattern: /^\.\s*$/m, rationale: 'Uploading the entire workspace widens leak blast radius.' },
  { id: 'node-modules', pattern: /node_modules/i, rationale: 'Dependency trees are huge and may embed secrets in env scripts.' },
];
