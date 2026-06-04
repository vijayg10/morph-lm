import { describe, it, expect, beforeEach } from 'vitest';
import { ConcurrencyLimiter } from '../../../src/agents/base/concurrency-limiter.js';
import { AppError } from '../../../src/types/common.types.js';

describe('ConcurrencyLimiter', () => {
  let limiter: ConcurrencyLimiter;

  beforeEach(() => {
    limiter = new ConcurrencyLimiter(2);
  });

  it('allows acquisition up to the limit', async () => {
    await limiter.acquire();
    await limiter.acquire();
    expect(limiter.getActiveCount()).toBe(2);
  });

  it('queues requests beyond the limit', async () => {
    await limiter.acquire();
    await limiter.acquire();
    expect(limiter.getQueueDepth()).toBe(0);

    const pending = limiter.acquire();
    expect(limiter.getQueueDepth()).toBe(1);

    limiter.release();
    await pending;
    expect(limiter.getActiveCount()).toBe(2);
    expect(limiter.getQueueDepth()).toBe(0);
  });

  it('decrements active count on release', async () => {
    await limiter.acquire();
    expect(limiter.getActiveCount()).toBe(1);
    limiter.release();
    expect(limiter.getActiveCount()).toBe(0);
  });

  it('does not go below 0 on extra release', () => {
    limiter.release();
    expect(limiter.getActiveCount()).toBe(0);
  });

  it('throws AppError on queue timeout', async () => {
    const fastLimiter = new (class extends ConcurrencyLimiter {
      constructor() { super(1); (this as unknown as { queueTimeoutMs: number }).queueTimeoutMs = 10; }
    })();
    await fastLimiter.acquire();
    await expect(fastLimiter.acquire()).rejects.toThrow(AppError);
  });
});
