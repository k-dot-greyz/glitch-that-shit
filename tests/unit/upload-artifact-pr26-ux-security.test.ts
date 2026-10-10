/**
 * UX/DX + security contract tests for PR #26:
 * Dependabot bump actions/upload-artifact 7.0.1 → 7.0.2 (pinned SHA).
 *
 * Story IDs: GT-PR26-*
 */

import { describe, it, expect } from 'vitest';
import {
  readWorkflowFile,
  parseWorkflowPermissions,
  extractUploadArtifactStepBlocks,
  parseArtifactPathLines,
  stepUsesPinnedFullSha,
  UPLOAD_ARTIFACT_V7_0_2_SHA,
  AGENTIC_WORKFLOW_INJECTION_PATTERNS,
  ARTIFACT_PATH_DENYLIST,
} from '../helpers/ci-workflow-harness';

const ciYaml = readWorkflowFile('ci.yml');

describe('GT-PR26 upload-artifact — contributor UX (happy path)', () => {
  it('GT-PR26-01: ci.yml pins upload-artifact to v7.0.2 full commit SHA', () => {
    expect(ciYaml).toMatch(
      new RegExp(`actions/upload-artifact@${UPLOAD_ARTIFACT_V7_0_2_SHA}\\s+# v7\\.0\\.2`),
    );
    const blocks = extractUploadArtifactStepBlocks(ciYaml);
    expect(blocks).toHaveLength(1);
    expect(stepUsesPinnedFullSha(blocks[0]!)).toBe(true);
  });

  it('GT-PR26-02: artifact upload runs after e2e with if: always() for failed-run diagnostics', () => {
    const e2eIdx = ciYaml.indexOf('npm run e2e');
    const uploadIdx = ciYaml.indexOf('actions/upload-artifact@');
    expect(e2eIdx).toBeGreaterThan(-1);
    expect(uploadIdx).toBeGreaterThan(e2eIdx);
    const uploadBlock = extractUploadArtifactStepBlocks(ciYaml)[0]!;
    expect(uploadBlock).toMatch(/if:\s*always\(\)/);
  });

  it('GT-PR26-03: artifact bundles e2e reports, release zips, and reproducibility hashes', () => {
    const paths = parseArtifactPathLines(extractUploadArtifactStepBlocks(ciYaml)[0]!);
    expect(paths).toContain('artifacts/e2e/');
    expect(paths.some((p) => p.includes('dist/*.zip'))).toBe(true);
    expect(paths.some((p) => p.includes('dist/*.sha256'))).toBe(true);
    expect(extractUploadArtifactStepBlocks(ciYaml)[0]!).toMatch(/name:\s*glitch-that-shit-e2e/);
  });
});

describe('GT-PR26 upload-artifact — graceful ablation & security (sad path)', () => {
  it('GT-PR26-04: missing artifact files warn instead of failing the job (e2e ablation)', () => {
    const uploadBlock = extractUploadArtifactStepBlocks(ciYaml)[0]!;
    expect(uploadBlock).toMatch(/if-no-files-found:\s*warn/);
    expect(uploadBlock).not.toMatch(/if-no-files-found:\s*error/);
  });

  it('GT-PR26-05: upload-artifact does not use floating version tags (@v7 / @v7.0.2 only)', () => {
    expect(ciYaml).not.toMatch(/actions\/upload-artifact@v\d/);
    expect(ciYaml).not.toMatch(/actions\/upload-artifact@7\.0\.2\b/);
  });

  it('GT-PR26-06: artifact path scope excludes secret-heavy trees (exfiltration guard)', () => {
    const paths = parseArtifactPathLines(extractUploadArtifactStepBlocks(ciYaml)[0]!);
    const combined = paths.join('\n');
    for (const rule of ARTIFACT_PATH_DENYLIST) {
      expect(combined).not.toMatch(rule.pattern);
    }
  });

  it('GT-PR26-07: workflow keeps least-privilege permissions (contents read only)', () => {
    const perms = parseWorkflowPermissions(ciYaml);
    expect(perms).toEqual({ contents: 'read' });
    expect(ciYaml).not.toMatch(/permissions:\s*write-all/i);
  });

  it('GT-PR26-08: ci.yml rejects agentic / malformed workflow injection patterns', () => {
    for (const rule of AGENTIC_WORKFLOW_INJECTION_PATTERNS) {
      expect(ciYaml).not.toMatch(rule.pattern);
    }
  });
});
