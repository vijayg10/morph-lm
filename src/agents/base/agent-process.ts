import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { AppError } from '../../types/common.types.js';

export interface SpawnOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

export interface ProcessResult {
  output: string;
  exitCode: number;
}

export async function runProcess(
  command: string,
  args: string[],
  options: SpawnOptions = {},
): Promise<ProcessResult> {
  const { cwd, timeoutMs = 300000, env } = options;
  const controller = new AbortController();

  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return new Promise<ProcessResult>((resolve, reject) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, args, {
        cwd,
        env: env ?? process.env,
        signal: controller.signal,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      clearTimeout(timeoutHandle);
      return reject(new AppError('AGENT_UNAVAILABLE', `Failed to spawn agent: ${command}`));
    }

    const outputChunks: string[] = [];
    const errorChunks: string[] = [];

    child.stdout?.on('data', (chunk: Buffer) => outputChunks.push(chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => errorChunks.push(chunk.toString()));

    child.on('error', (err) => {
      clearTimeout(timeoutHandle);
      if (controller.signal.aborted) {
        reject(new AppError('AGENT_TIMEOUT', `Agent execution timed out after ${timeoutMs}ms`));
      } else {
        reject(new AppError('AGENT_UNAVAILABLE', `Agent process error: ${err.message}`));
      }
    });

    child.on('close', (code) => {
      clearTimeout(timeoutHandle);
      resolve({
        output: outputChunks.join(''),
        exitCode: code ?? 1,
      });
    });
  });
}

export async function* streamProcess(
  command: string,
  args: string[],
  options: SpawnOptions = {},
): AsyncGenerator<string> {
  const { cwd, timeoutMs = 300000, env } = options;
  const controller = new AbortController();

  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(command, args, {
      cwd,
      env: env ?? process.env,
      signal: controller.signal,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    clearTimeout(timeoutHandle);
    throw new AppError('AGENT_UNAVAILABLE', `Failed to spawn agent: ${command}`);
  }

  const rl = createInterface({ input: child.stdout! });

  try {
    for await (const line of rl) {
      if (controller.signal.aborted) {
        throw new AppError('AGENT_TIMEOUT', `Agent execution timed out after ${timeoutMs}ms`);
      }
      yield line;
    }
  } finally {
    clearTimeout(timeoutHandle);
    rl.close();
    if (!child.killed) child.kill('SIGTERM');
  }
}
