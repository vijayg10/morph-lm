import { which } from '../../utils/which.js';
import { runProcess, streamProcess } from '../base/agent-process.js';
import { ConcurrencyLimiter } from '../base/concurrency-limiter.js';
import { agentActiveProcesses, agentExecutionsTotal, agentExecutionDuration } from '../../telemetry/metrics.js';
import type { AgentAdapter } from '../base/agent-adapter.interface.js';
import type { ChatRequest, AgentResponse } from '../../types/common.types.js';

export class GeminiAdapter implements AgentAdapter {
  readonly name = 'gemini:mlm';
  private readonly limiter: ConcurrencyLimiter;

  constructor(
    private readonly timeoutMs: number,
    concurrencyLimit: number,
  ) {
    this.limiter = new ConcurrencyLimiter(concurrencyLimit);
  }

  async checkAvailability(): Promise<boolean> {
    return which('gemini');
  }

  async chat(request: ChatRequest): Promise<AgentResponse> {
    await this.limiter.acquire();
    agentActiveProcesses.labels(this.name).inc();
    const start = Date.now();
    try {
      const prompt = request.messages.map((m) => `${m.role}: ${m.content}`).join('\n');
      const result = await runProcess('gemini', ['-p', prompt], {
        ...(request.workspace != null ? { cwd: request.workspace } : {}),
        timeoutMs: this.timeoutMs,
      });
      agentExecutionsTotal.labels(this.name, result.exitCode === 0 ? 'success' : 'error').inc();
      return {
        content: result.output.trim(),
        model: this.name,
        done: true,
        durationMs: Date.now() - start,
      };
    } finally {
      agentActiveProcesses.labels(this.name).dec();
      agentExecutionDuration.labels(this.name).observe((Date.now() - start) / 1000);
      this.limiter.release();
    }
  }

  async *streamChat(request: ChatRequest): AsyncGenerator<string> {
    await this.limiter.acquire();
    agentActiveProcesses.labels(this.name).inc();
    const start = Date.now();
    try {
      const prompt = request.messages.map((m) => `${m.role}: ${m.content}`).join('\n');
      yield* streamProcess('gemini', ['-p', prompt], {
        ...(request.workspace != null ? { cwd: request.workspace } : {}),
        timeoutMs: this.timeoutMs,
      });
      agentExecutionsTotal.labels(this.name, 'success').inc();
    } catch (err) {
      agentExecutionsTotal.labels(this.name, 'error').inc();
      throw err;
    } finally {
      agentActiveProcesses.labels(this.name).dec();
      agentExecutionDuration.labels(this.name).observe((Date.now() - start) / 1000);
      this.limiter.release();
    }
  }
}
