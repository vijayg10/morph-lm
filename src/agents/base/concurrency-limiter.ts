import { AppError } from '../../types/common.types.js';

interface QueueEntry {
  resolve: () => void;
  reject: (err: Error) => void;
}

export class ConcurrencyLimiter {
  private activeCount = 0;
  private readonly queue: QueueEntry[] = [];
  private readonly queueTimeoutMs = 30000;

  constructor(private readonly limit: number) {}

  async acquire(): Promise<void> {
    if (this.activeCount < this.limit) {
      this.activeCount++;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.queue.findIndex((e) => e.resolve === resolve);
        if (idx !== -1) this.queue.splice(idx, 1);
        reject(
          new AppError(
            'AGENT_CONCURRENCY_LIMIT',
            'Agent is at capacity, request timed out in queue',
          ),
        );
      }, this.queueTimeoutMs);

      this.queue.push({
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject,
      });
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      // Pass the slot directly to the next waiter — no change to activeCount
      next.resolve();
    } else {
      this.activeCount = Math.max(0, this.activeCount - 1);
    }
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getQueueDepth(): number {
    return this.queue.length;
  }
}
