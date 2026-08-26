import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';

const HOST = '127.0.0.1';
const PORT = 3891;
export const BASE_URL = `http://${HOST}:${PORT}`;
export const API_KEY = 'func-test-key';

const tsxBin = path.resolve(process.cwd(), 'node_modules/.bin/tsx');

async function waitForHealth(timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {
      // server not accepting connections yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`func test server did not become healthy within ${timeoutMs}ms`);
}

export async function setup(): Promise<() => Promise<void>> {
  const logs: string[] = [];
  const child: ChildProcess = spawn(tsxBin, ['src/server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST,
      PORT: String(PORT),
      API_KEY,
      ENABLE_GEMINI: 'true',
      ENABLE_CLAUDE: 'true',
      ENABLE_AIDER: 'false',
      LOG_LEVEL: 'error',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk: Buffer) => logs.push(chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => logs.push(chunk.toString()));

  const exitedEarly = new Promise<never>((_resolve, reject) => {
    child.once('exit', (code) => {
      reject(new Error(`func test server exited early (code ${code}):\n${logs.join('')}`));
    });
  });

  try {
    await Promise.race([waitForHealth(15000), exitedEarly]);
  } catch (err) {
    child.removeAllListeners('exit');
    child.kill('SIGTERM');
    console.error(logs.join(''));
    throw err;
  }
  child.removeAllListeners('exit');

  process.env.FUNC_TEST_BASE_URL = BASE_URL;
  process.env.FUNC_TEST_API_KEY = API_KEY;

  const modelsRes = await fetch(`${BASE_URL}/v1/models`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const modelsBody = (await modelsRes.json()) as { data: Array<{ id: string }> };
  const modelIds = modelsBody.data.map((m) => m.id);
  if (modelIds.length === 0) {
    child.kill('SIGTERM');
    throw new Error('func test server started but no agent CLI is available on PATH');
  }
  process.env.FUNC_TEST_MODELS = modelIds.join(',');

  return async () => {
    await new Promise<void>((resolve) => {
      child.once('exit', () => resolve());
      child.kill('SIGTERM');
      // Fallback in case the process ignores SIGTERM.
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
        resolve();
      }, 5000).unref();
    });
  };
}
