/**
 * CI workflow contract harness — parses workflow YAML as text for deterministic checks.
 */

import fs from 'node:fs';
import path from 'node:path';

const WORKFLOW_DIR = path.join(process.cwd(), '.github/workflows');
const NVMRC_PATH = path.join(process.cwd(), '.nvmrc');
const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');

/** Full commit pin for actions/setup-node v7.1.0 (Dependabot PR #25). */
export const SETUP_NODE_V7_1_SHA = '949feb2413d6458794dcd2491c4babbbce0c15c1';

export function readWorkflowFile(filename: string): string {
  const full = path.join(WORKFLOW_DIR, filename);
  if (!fs.existsSync(full)) {
    throw new Error(`missing workflow file: ${full}`);
  }
  return fs.readFileSync(full, 'utf8');
}

export function readNvmrc(): string {
  if (!fs.existsSync(NVMRC_PATH)) {
    throw new Error('missing .nvmrc');
  }
  return fs.readFileSync(NVMRC_PATH, 'utf8').trim();
}

export function readPackageEnginesNode(): string {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8')) as {
    engines?: { node?: string };
  };
  const node = pkg.engines?.node;
  if (!node) {
    throw new Error('package.json missing engines.node');
  }
  return node;
}

/** Block under `uses: actions/setup-node@...` through the next step or EOF. */
export function extractSetupNodeStepBlock(workflowYaml: string): string {
  const marker = /uses:\s*actions\/setup-node@/m;
  const match = marker.exec(workflowYaml);
  if (!match) {
    throw new Error('ci.yml missing actions/setup-node step');
  }
  const start = match.index;
  const rest = workflowYaml.slice(start);
  const nextStep = rest.search(/\n\s{6}- uses:|\n\s{6}- run:|\n\s{6}- name:/);
  const end = nextStep === -1 ? rest.length : nextStep;
  return rest.slice(0, end);
}

export function parseSetupNodeWithBlock(block: string): Record<string, string> {
  const withBlock: Record<string, string> = {};
  const withMatch = block.match(/\n\s{8}with:\n([\s\S]*?)(?=\n\s{6}-|\n\s{4}\w|$)/);
  if (!withMatch) {
    return withBlock;
  }
  for (const line of withMatch[1].split('\n')) {
    const m = line.match(/^\s{10}([\w-]+):\s*(.+)$/);
    if (m) {
      withBlock[m[1]] = m[1] === 'cache' ? m[2].trim() : m[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return withBlock;
}

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

/** setup-node v7.1 adds absolute node-version-file — block repo escape and shadow toolchains. */
export const SETUP_NODE_VERSION_FILE_DENYLIST: Array<{ id: string; pattern: RegExp; rationale: string }> = [
  {
    id: 'absolute-version-file',
    pattern: /node-version-file:\s*\/[^\n]+/i,
    rationale: 'Absolute node-version-file can read arbitrary host paths (v7.1 feature abuse).',
  },
  {
    id: 'traversal-version-file',
    pattern: /node-version-file:\s*['"]?\.\./i,
    rationale: 'Path traversal in node-version-file could pin CI to attacker-controlled version files.',
  },
  {
    id: 'mise-shadow',
    pattern: /node-version-file:\s*['"]?mise\.toml/i,
    rationale: 'mise.toml support is new in 7.1; repo standard is .nvmrc only unless explicitly adopted.',
  },
];

export const NODE_AUTH_TOKEN_LEAK_PATTERNS: Array<{ id: string; pattern: RegExp; rationale: string }> = [
  {
    id: 'echo-node-auth',
    pattern: /run:.*\becho\b.*NODE_AUTH_TOKEN/i,
    rationale: 'setup-node v7 sets NODE_AUTH_TOKEN; echoing it leaks registry credentials in logs.',
  },
  {
    id: 'printenv-node-auth',
    pattern: /run:.*\b(printenv|env)\b.*NODE_AUTH_TOKEN/i,
    rationale: 'Dumping env containing NODE_AUTH_TOKEN exposes secrets in CI output.',
  },
];
