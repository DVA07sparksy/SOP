// Queue abstraction (architecture doc §36): the API enqueues, workers
// consume. Two interchangeable drivers:
//   - "redis": BullMQ over Upstash/Redis — the production path.
//   - "memory": in-process handoff, zero external infra (local dev, demos,
//     CI). Same enqueue API; processing still happens in the ai-worker app
//     when it runs in the same process tree via @sop/shared startWorkers().
//
// Queue names are shared verbatim between API and worker — one source of
// truth here.

import { getRedisConnection } from "./redisConnection";

export const QueueNames = {
  crawl: "crawl",
  extraction: "extraction",
  eligibility: "eligibility",
  duplicateDetection: "duplicate-detection",
  verification: "verification",
  assistant: "assistant",
  notifications: "notifications",
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

export interface Envelope {
  name: string;
  data: unknown;
}

export interface QueueDriver {
  enqueue(queue: QueueName, name: string, data: unknown): Promise<void>;
  process(
    queue: QueueName,
    handler: (data: any) => Promise<unknown>,
    opts?: { concurrency?: number }
  ): void;
  close(): Promise<void>;
}

export function queueDriverFromEnv(): QueueDriver {
  const driver = process.env.QUEUE_DRIVER ?? (process.env.REDIS_URL ? "redis" : "memory");
  return driver === "redis" ? new RedisDriver() : new MemoryDriver();
}

// Process-wide singleton. Enqueuers (API routes, agents) and consumers
// (startWorkers) MUST share one driver instance — for the memory driver the
// handler registry lives on the instance, so two instances would mean jobs
// silently dropped.
let driverSingleton: QueueDriver | null = null;

export function getQueueDriver(): QueueDriver {
  if (!driverSingleton) driverSingleton = queueDriverFromEnv();
  return driverSingleton;
}

// --------------------------------------------------------------- Redis driver

class RedisDriver implements QueueDriver {
  private queues = new Map<string, any>();

  private queueFor(queue: QueueName): any {
    if (!this.queues.has(queue)) {
      const { Queue } = require("bullmq") as typeof import("bullmq");
      this.queues.set(queue, new Queue(queue, { connection: getRedisConnection() }));
    }
    return this.queues.get(queue);
  }

  async enqueue(queue: QueueName, name: string, data: unknown): Promise<void> {
    await this.queueFor(queue).add(name, data);
  }

  process(queue: QueueName, handler: (data: any) => Promise<unknown>): void {
    const { Worker } = require("bullmq") as typeof import("bullmq");
    new Worker(
      queue,
      async (job: any) => handler(job.data),
      { connection: getRedisConnection(), concurrency: Number(process.env.WORKER_CONCURRENCY ?? 5) }
    );
  }

  async close(): Promise<void> {
    getRedisConnection().quit();
  }
}

// -------------------------------------------------------------- Memory driver

class MemoryDriver implements QueueDriver {
  private handlers = new Map<QueueName, (data: any) => Promise<unknown>>();

  async enqueue(queue: QueueName, name: string, data: unknown): Promise<void> {
    const handler = this.handlers.get(queue);
    if (!handler) {
      // No worker registered in this process: the job stays queued until one
      // starts (ai-worker with QUEUE_DRIVER=memory). Drop silently otherwise.
      return;
    }
    // Fire-and-forget with error containment, mirroring BullMQ semantics.
    void Promise.resolve()
      .then(() => handler(data))
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[queue:memory] job failed on ${queue}:`, err?.message ?? err);
      });
  }

  process(queue: QueueName, handler: (data: any) => Promise<unknown>): void {
    this.handlers.set(queue, handler);
  }

  async close(): Promise<void> {
    /* nothing to release */
  }
}
