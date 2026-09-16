// The API no longer owns queues: enqueueing goes through @sop/shared's
// enqueue facade, which routes to BullMQ/Redis (production) or the in-process
// memory driver (zero-infra dev). This module keeps a lazy QueueEvents helper
// for request-response patterns like the assistant chat.

import { QueueEvents } from "bullmq";
import { QueueNames } from "@sop/shared";

export { enqueue } from "@sop/shared";
export { QueueNames };

let assistantEvents: QueueEvents | null = null;

export function getAssistantQueueEvents(): QueueEvents {
  if (!assistantEvents) {
    // Only valid with the redis driver; memory mode answers inline instead.
    const { getRedisConnection } = require("@sop/shared/dist/redisConnection") as typeof import("@sop/shared/dist/redisConnection");
    assistantEvents = new QueueEvents(QueueNames.assistant, { connection: getRedisConnection() });
  }
  return assistantEvents;
}

export function isRedisQueue(): boolean {
  const driver = process.env.QUEUE_DRIVER ?? (process.env.REDIS_URL ? "redis" : "memory");
  return driver === "redis";
}
