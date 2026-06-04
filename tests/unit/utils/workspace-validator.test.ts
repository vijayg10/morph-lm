import { describe, it, expect } from 'vitest';
import { validateWorkspace } from '../../../src/utils/workspace-validator.js';

describe('validateWorkspace', () => {
  it('allows any path when allowlist is empty', () => {
    expect(() => validateWorkspace('/any/path', [])).not.toThrow();
  });

  it('allows exact match from allowlist', () => {
    expect(() => validateWorkspace('/repos/project', ['/repos/project'])).not.toThrow();
  });

  it('allows subdirectory of allowlisted path', () => {
    expect(() => validateWorkspace('/repos/project/src', ['/repos/project'])).not.toThrow();
  });

  it('rejects paths outside allowlist', () => {
    expect(() => validateWorkspace('/tmp/evil', ['/repos/project'])).toThrow();
  });

  it('prevents path traversal outside allowed dir', () => {
    expect(() => validateWorkspace('/repos/project/../evil', ['/repos/project'])).toThrow();
  });

  it('does not throw for empty workspace string', () => {
    expect(() => validateWorkspace('', ['/repos'])).not.toThrow();
  });
});
