/**
 * UX/DX + security contract tests for Dependabot PR #27:
 * actions/checkout v4 → v7 in CodeQL (CI already pinned on v7.0.1).
 *
 * Story IDs: GT-PR27-*
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  readWorkflowFile,
  extractCheckoutActionRefs,
  CHECKOUT_V7_PIN_SHA,
  parseWorkflowPermissions,
  AGENTIC_WORKFLOW_INJECTION_PATTERNS,
  CHECKOUT_SUPPLY_CHAIN_DENYLIST,
} from '../helpers/ci-workflow-harness';

const ciYaml = readWorkflowFile('ci.yml');
const codeqlYaml = readWorkflowFile('codeql.yml');

function listWorkflowYamlFiles(): string[] {
  const dir = path.join(process.cwd(), '.github/workflows');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'));
}

describe('GT-PR27 actions/checkout@v7 — contributor UX (happy path)', () => {
  it('GT-PR27-01: CodeQL workflow checks out with actions/checkout@v7', () => {
    const refs = extractCheckoutActionRefs(codeqlYaml);
    expect(refs).toContain('v7');
    expect(refs.some((r) => /^v4\b/i.test(r))).toBe(false);
  });

  it('GT-PR27-02: primary CI pins checkout to v7.0.1 commit SHA (reproducible DX)', () => {
    const refs = extractCheckoutActionRefs(ciYaml);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toBe(CHECKOUT_V7_PIN_SHA);
    expect(ciYaml).toMatch(new RegExp(`actions/checkout@${CHECKOUT_V7_PIN_SHA}.*# v7\\.0\\.1`));
  });

  it('GT-PR27-03: checkout major is v7 across CI + CodeQL (dependabot alignment)', () => {
    const allRefs = [...extractCheckoutActionRefs(ciYaml), ...extractCheckoutActionRefs(codeqlYaml)];
    for (const ref of allRefs) {
      const isV7Family = ref === 'v7' || ref === CHECKOUT_V7_PIN_SHA || ref.startsWith('v7.');
      expect(isV7Family, `unexpected checkout ref: ${ref}`).toBe(true);
    }
  });
});

describe('GT-PR27 actions/checkout — security & graceful ablation (sad path)', () => {
  it('GT-PR27-04: no legacy checkout majors in any workflow (supply-chain regression)', () => {
    const combined = listWorkflowYamlFiles().join('\n');
    for (const rule of CHECKOUT_SUPPLY_CHAIN_DENYLIST) {
      expect(combined).not.toMatch(rule.pattern);
    }
  });

  it('GT-PR27-05: checkout steps do not persist credentials (token exfiltration vector)', () => {
    const combined = `${ciYaml}\n${codeqlYaml}`;
    expect(combined).not.toMatch(/persist-credentials:\s*true/i);
  });

  it('GT-PR27-06: CI workflow token scope stays read-only for contents at checkout time', () => {
    const perms = parseWorkflowPermissions(ciYaml);
    expect(perms.contents).toBe('read');
    expect(perms.contents).not.toBe('write');
    expect(ciYaml).not.toMatch(/permissions:\s*write-all/i);
  });

  it('GT-PR27-07: workflows reject agentic / malformed request injection in run steps', () => {
    const combined = listWorkflowYamlFiles().join('\n');
    for (const rule of AGENTIC_WORKFLOW_INJECTION_PATTERNS) {
      expect(combined).not.toMatch(rule.pattern);
    }
  });

  it('GT-PR27-08: CodeQL still initializes both JS/TS and Actions analyzers after checkout bump', () => {
    expect(codeqlYaml).toMatch(/language:\s*javascript-typescript/);
    expect(codeqlYaml).toMatch(/language:\s*actions/);
    expect(codeqlYaml).toMatch(/github\/codeql-action\/init@v4/);
  });
});
