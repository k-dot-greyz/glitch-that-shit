/**
 * CI workflow contract harness — parses workflow YAML as text for deterministic checks.
 */

import fs from 'node:fs';
import path from 'node:path';

const WORKFLOW_DIR = path.join(process.cwd(), '.github/workflows');
const BRANCH_PROTECTION_DOC = path.join(process.cwd(), '.github/BRANCH_PROTECTION.md');

export function readWorkflowFile(filename: string): string {
  const full = path.join(WORKFLOW_DIR, filename);
  if (!fs.existsSync(full)) {
    throw new Error(`missing workflow file: ${full}`);
  }
  return fs.readFileSync(full, 'utf8');
}

export function readBranchProtectionDoc(): string {
  if (!fs.existsSync(BRANCH_PROTECTION_DOC)) {
    throw new Error('missing .github/BRANCH_PROTECTION.md');
  }
  return fs.readFileSync(BRANCH_PROTECTION_DOC, 'utf8');
}

/** Every `uses: actions/checkout@…` ref in a workflow file. */
export function extractCheckoutActionRefs(workflowYaml: string): string[] {
  const refs: string[] = [];
  const re = /uses:\s*actions\/checkout@([^\s#]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(workflowYaml)) !== null) {
    refs.push(match[1].trim());
  }
  return refs;
}

/** Known-good full commit pin for actions/checkout v7.0.1 (matches Dependabot / ci.yml). */
export const CHECKOUT_V7_PIN_SHA = '3d3c42e5aac5ba805825da76410c181273ba90b1';

/** Job-level `name:` fields under `jobs:` (excludes workflow top-level name). */
export function extractJobDisplayNames(workflowYaml: string): string[] {
  const jobsIdx = workflowYaml.indexOf('\njobs:');
  if (jobsIdx === -1) {
    return [];
  }
  const jobsSection = workflowYaml.slice(jobsIdx);
  const names: string[] = [];
  const re = /^\s{4}name:\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(jobsSection)) !== null) {
    names.push(match[1].trim());
  }
  return names;
}

/** Required status check names from the branch protection markdown table. */
export function extractRequiredChecksFromDoc(doc: string): string[] {
  const checks: string[] = [];
  const rowRe = /^\|\s*`([^`]+)`\s*\|/gm;
  let match: RegExpExecArray | null;
  while ((match = rowRe.exec(doc)) !== null) {
    const name = match[1].trim();
    if (name !== 'Check name') {
      checks.push(name);
    }
  }
  return checks;
}

export function expandCodeqlCheckNames(jobNameTemplate: string): string[] {
  if (!jobNameTemplate.includes('matrix.language')) {
    return [jobNameTemplate];
  }
  return ['Analyze (javascript-typescript)', 'Analyze (actions)'];
}

export function resolveExpectedStatusChecks(ciYaml: string, codeqlYaml: string): string[] {
  const ciNames = extractJobDisplayNames(ciYaml);
  const codeqlJobNames = extractJobDisplayNames(codeqlYaml);
  const expanded = codeqlJobNames.flatMap(expandCodeqlCheckNames);
  return [...ciNames, ...expanded];
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

export const CHECKOUT_SUPPLY_CHAIN_DENYLIST: Array<{ id: string; pattern: RegExp; rationale: string }> = [
  {
    id: 'checkout-v4',
    pattern: /uses:\s*actions\/checkout@v4\b/i,
    rationale: 'PR #27 upgrades CodeQL from checkout v4 → v7; v4 is a regression target.',
  },
  {
    id: 'checkout-v3-or-older',
    pattern: /uses:\s*actions\/checkout@v[1-3]\b/i,
    rationale: 'EOL checkout majors lack security fixes.',
  },
];
