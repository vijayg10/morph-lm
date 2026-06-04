import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

vi.mock('node:child_process', () => {
  const mockSpawn = vi.fn();
  return { spawn: mockSpawn };
});

describe('runProcess', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves with output and exit code 0', async () => {
    const { spawn } = await import('node:child_process');
    const proc = new EventEmitter() as any;
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    vi.mocked(spawn).mockReturnValue(proc as any);

    const { runProcess } = await import('../../../src/agents/base/agent-process.js');
    const promise = runProcess('echo', ['hello'], { timeoutMs: 5000 });

    proc.stdout.emit('data', Buffer.from('hello'));
    proc.emit('close', 0);

    const result = await promise;
    expect(result.output).toBe('hello');
    expect(result.exitCode).toBe(0);
  });

  it('rejects when process exits non-zero', async () => {
    const { spawn } = await import('node:child_process');
    const proc = new EventEmitter() as any;
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    vi.mocked(spawn).mockReturnValue(proc as any);

    const { runProcess } = await import('../../../src/agents/base/agent-process.js');
    const promise = runProcess('false', [], { timeoutMs: 5000 });

    proc.emit('close', 1);

    // Non-zero exit should still resolve (we track exitCode)
    const result = await promise;
    expect(result.exitCode).toBe(1);
  });
});

describe('streamProcess', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('yields lines as they arrive', async () => {
    const { spawn } = await import('node:child_process');
    const { Readable } = await import('node:stream');
    const proc = new EventEmitter() as any;
    proc.stdout = Readable.from(['line1\n', 'line2\n']);
    proc.stderr = new EventEmitter();
    proc.killed = false;
    proc.kill = vi.fn();
    vi.mocked(spawn).mockReturnValue(proc as any);

    const { streamProcess } = await import('../../../src/agents/base/agent-process.js');
    const gen = streamProcess('echo', ['hello'], { timeoutMs: 5000 });

    const lines: string[] = [];
    for await (const c of gen) lines.push(c);

    expect(lines).toEqual(['line1', 'line2']);
  });
});

