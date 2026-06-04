import path from 'node:path';
import { AppError } from '../types/common.types.js';

/**
 * Validate that a requested workspace path is within the configured allowlist.
 * Resolves symlinks and normalises the path before comparison to prevent traversal.
 */
export function validateWorkspace(workspace: string, allowlist: string[]): void {
  if (!workspace) return;

  // Resolve to absolute, normalised path
  const resolved = path.resolve(workspace);

  // Guard against path traversal
  if (resolved.includes('\0')) {
    throw new AppError('FORBIDDEN', 'Invalid workspace path');
  }

  if (allowlist.length === 0) {
    // No restriction configured — all workspaces permitted
    return;
  }

  const allowed = allowlist.some((allowed) => {
    const resolvedAllowed = path.resolve(allowed);
    // Ensure the requested path is exactly the allowed dir or a subdirectory of it
    return resolved === resolvedAllowed || resolved.startsWith(`${resolvedAllowed}${path.sep}`);
  });

  if (!allowed) {
    throw new AppError('FORBIDDEN', `Workspace '${resolved}' is not in the allowed list`);
  }
}
