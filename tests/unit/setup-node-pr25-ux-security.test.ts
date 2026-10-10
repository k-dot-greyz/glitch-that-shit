/**
 * UX/DX + security contract tests for PR #25:
 * actions/setup-node 7.0.0 → 7.1.0 and node-version-file alignment with .nvmrc.
 *
 * Story IDs: GT-PR25-*
 */

import { describe, it, expect } from 'vitest';
import {
  readWorkflowFile,
  readNvmrc,
  readPackageEnginesNode,
  extractSetupNodeStepBlock,
  parseSetupNodeWithBlock,
  parseWorkflowPermissions,
  SETUP_NODE_V7_1_SHA,
  AGENTIC_WORKFLOW_INJECTION_PATTERNS,
  SETUP_NODE_VERSION_FILE_DENYLIST,
  NODE_AUTH_TOKEN_LEAK_PATTERNS,
} from '../helpers/ci-workflow-harness';

const ciYaml = readWorkflowFile('ci.yml');
const setupNodeBlock = extractSetupNodeStepBlock(ciYaml);
const setupWith = parseSetupNodeWithBlock(setupNodeBlock);

describe('GT-PR25 setup-node 7.1.0 — contributor UX (happy path)', () => {
  it('GT-PR25-01: setup-node is full-SHA pinned to v7.1.0', () => {
    expect(setupNodeBlock).toMatch(
      new RegExp(`uses:\\s*actions/setup-node@${SETUP_NODE_V7_1_SHA}\\s+# v7\\.1\\.0`),
    );
    expect(setupNodeBlock).not.toMatch(/uses:\s*actions\/setup-node@v7\.1\.0\b/);
  });

  it('GT-PR25-02: CI reads Node version from repo .nvmrc (not hard-coded matrix drift)', () => {
    expect(setupWith['node-version-file']).toBe('.nvmrc');
    expect(setupWith['node-version']).toBeUndefined();
    expect(readNvmrc()).toBe('24');
  });

  it('GT-PR25-03: npm cache remains enabled after the action bump', () => {
    expect(setupWith.cache).toBe('npm');
  });

  it('GT-PR25-04: .nvmrc major satisfies package.json engines.node floor', () => {
    const nvmMajor = Number.parseInt(readNvmrc(), 10);
    const engines = readPackageEnginesNode();
    expect(nvmMajor).toBeGreaterThanOrEqual(22);
    expect(engines).toMatch(/22\.12|24|>=22/);
  });

  it('GT-PR25-05: verify job gate order matches CONTRIBUTING (lint → test → build)', () => {
    const lintIdx = ciYaml.indexOf('run: npm run lint');
    const testIdx = ciYaml.indexOf('run: npm test');
    const buildIdx = ciYaml.indexOf('run: npm run build');
    expect(lintIdx).toBeGreaterThan(-1);
    expect(testIdx).toBeGreaterThan(lintIdx);
    expect(buildIdx).toBeGreaterThan(testIdx);
    expect(ciYaml).toMatch(/run: npm ci\b/);
  });
});

describe('GT-PR25 setup-node 7.1.0 — security & graceful ablation (sad path)', () => {
  it('GT-PR25-06: node-version-file denylist blocks traversal / absolute / mise shadow configs', () => {
    for (const rule of SETUP_NODE_VERSION_FILE_DENYLIST) {
      expect(ciYaml).not.toMatch(rule.pattern);
    }
  });

  it('GT-PR25-07: CI workflow keeps least-privilege permissions (contents read)', () => {
    const perms = parseWorkflowPermissions(ciYaml);
    expect(perms).toEqual({ contents: 'read' });
  });

  it('GT-PR25-08: no NODE_AUTH_TOKEN logging patterns (setup-node v7 registry auth)', () => {
    for (const rule of NODE_AUTH_TOKEN_LEAK_PATTERNS) {
      expect(ciYaml).not.toMatch(rule.pattern);
    }
    expect(ciYaml).not.toMatch(/registry-url:/i);
  });

  it('GT-PR25-09: workflows reject agentic / malformed CI injection patterns', () => {
    for (const rule of AGENTIC_WORKFLOW_INJECTION_PATTERNS) {
      expect(ciYaml).not.toMatch(rule.pattern);
    }
  });

  it('GT-PR25-10: concurrency cancel-in-progress remains (stale green ablation)', () => {
    expect(ciYaml).toMatch(/concurrency:/);
    expect(ciYaml).toMatch(/cancel-in-progress:\s*true/);
  });
});
