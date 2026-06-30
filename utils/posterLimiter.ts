/**
 * posterLimiter.ts
 *
 * A simple concurrency limiter (semaphore) that caps the number of
 * simultaneous poster-fetch requests. This prevents flooding the h5ai
 * server when a large folder is opened (e.g. 100 movies = 100 requests).
 *
 * Usage:
 *   import { posterLimiter } from '../utils/posterLimiter';
 *   const items = await posterLimiter.run(() => fetchDirectory(href, signal));
 */

class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  /**
   * Wraps an async task and ensures it only executes when a slot is free.
   * If all slots are occupied the task is queued until one frees up.
   */
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= this.max) {
      // Wait for a free slot
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
      // Unblock the next queued task, if any
      const next = this.queue.shift();
      if (next) next();
    }
  }

  /** How many tasks are currently running */
  get activeCount(): number {
    return this.running;
  }

  /** How many tasks are waiting in the queue */
  get pendingCount(): number {
    return this.queue.length;
  }
}

/**
 * Singleton limiter — max 5 concurrent poster-fetch requests at a time.
 * Tweak the number if needed, but 5 is a sweet spot for most local LAN servers.
 */
export const posterLimiter = new ConcurrencyLimiter(12);
