/**
 * UX/DX + security contract tests for merged PR #16:
 * CI workflow, CodeQL scanning, and branch protection alignment.
 *
 * Story IDs: GT-PR16-*
 */

import { describe, it, expect } from 'vitest';
import {
  readWorkflowFile,
  readBranchProtectionDoc,
  extractJobDisplayNames,
  extractRequiredChecksFromDoc,
  resolveExpectedStatusChecks,
  parseWorkflowPermissions,
  AGENTIC_WORKFLOW_INJECTION_PATTERNS,
  CODEQL_REGRESSION_DENYLIST,
} from '../helpers/ci-workflow-harness';

const ciYaml = readWorkflowFile('ci.yml');
const codeqlYaml = readWorkflowFile('codeql.yml');
const branchDoc = readBranchProtectionDoc();

describe('GT-PR16 CI/CodeQL — contributor UX (happy path)', () => {
  it('GT-PR16-01: ci.yml runs on push and pull_request to main', () => {
    expect(ciYaml).toMatch(/on:\s*\n\s*push:\s*\n\s*branches:\s*\[main\]/);
    expect(ciYaml).toMatch(/pull_request:\s*\n\s*branches:\s*\[main\]/);
  });

  it('GT-PR16-02: quality job mirrors CONTRIBUTING local gate order (lint → test → build)', () => {
    const lintIdx = ciYaml.indexOf('run: npm run lint');
    const testIdx = ciYaml.indexOf('run: npm test');
    const buildIdx = ciYaml.indexOf('run: npm run build');
    expect(lintIdx).toBeGreaterThan(-1);
    expect(testIdx).toBeGreaterThan(lintIdx);
    expect(buildIdx).toBeGreaterThan(testIdx);
    expect(ciYaml).toMatch(/node-version:\s*"24"/);
    expect(ciYaml).toMatch(/run: npm ci\b/);
  });

  it('GT-PR16-03: BRANCH_PROTECTION required checks match workflow job display names', () => {
    const expected = resolveExpectedStatusChecks(ciYaml, codeqlYaml);
    const documented = extractRequiredChecksFromDoc(branchDoc);
    expect(documented.sort()).toEqual(expected.sort());
  });

  it('GT-PR16-04: ci job display name is merge-gate friendly', () => {
    expect(extractJobDisplayNames(ciYaml)).toContain('Lint, test, and build');
  });
});

describe('GT-PR16 CI/CodeQL — security & graceful ablation (sad path)', () => {
  it('GT-PR16-05: ci.yml uses least-privilege permissions (contents read only)', () => {
    const perms = parseWorkflowPermissions(ciYaml);
    expect(perms).toEqual({ contents: 'read' });
    expect(ciYaml).not.toMatch(/permissions:\s*write-all/i);
  });

  it('GT-PR16-06: codeql.yml grants security-events write without contents write', () => {
    const perms = parseWorkflowPermissions(codeqlYaml);
    expect(perms.contents).toBe('read');
    expect(perms['security-events']).toBe('write');
    expect(perms.actions).toBe('read');
    expect(perms.contents).not.toBe('write');
  });

  it('GT-PR16-07: CodeQL matrix covers JS/TS and Actions (workflow supply chain)', () => {
    expect(codeqlYaml).toMatch(/language:\s*javascript-typescript/);
    expect(codeqlYaml).toMatch(/language:\s*actions/);
    expect(codeqlYaml).toMatch(/github\/codeql-action\/init@v4/);
    expect(codeqlYaml).toMatch(/github\/codeql-action\/analyze@v4/);
  });

  it('GT-PR16-08: CodeQL regression denylist — no artifact download step', () => {
    for (const rule of CODEQL_REGRESSION_DENYLIST) {
      expect(codeqlYaml).not.toMatch(rule.pattern);
    }
  });

  it('GT-PR16-09: workflows reject agentic / malformed CI injection patterns', () => {
    const combined = `${ciYaml}\n${codeqlYaml}`;
    for (const rule of AGENTIC_WORKFLOW_INJECTION_PATTERNS) {
      expect(combined).not.toMatch(rule.pattern);
    }
  });

  it('GT-PR16-10: ci concurrency cancels stale runs (ablation under load)', () => {
    expect(ciYaml).toMatch(/concurrency:/);
    expect(ciYaml).toMatch(/cancel-in-progress:\s*true/);
  });

  it('GT-PR16-11: CodeQL weekly schedule remains enabled (security drift sad path if removed)', () => {
    expect(codeqlYaml).toMatch(/schedule:[\s\S]*?-\s*cron:\s*"/);
  });
});
