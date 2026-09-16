// Single enqueue facade used by API routes and agents. Wraps the active
// queue driver (redis | memory) behind named helpers so call sites never
// touch driver details. The driver is a process-wide singleton shared with
// startWorkers() so memory-mode enqueues reach in-process handlers.

import { getQueueDriver, QueueNames } from "./queues";

const driver = getQueueDriver();

// Callers use the QueueNames keys ("duplicateDetection"); the driver gets
// the actual queue name ("duplicate-detection").
async function add(queue: keyof typeof QueueNames, name: string, data: unknown): Promise<void> {
  await driver.enqueue(QueueNames[queue], name, data);
}

export const enqueue = {
  crawl: (data: { url: string; submittedBy?: string }) => add("crawl", "crawl-url", data),
  extraction: (data: { rawPageId: string }) => add("extraction", "extract", data),
  eligibility: (data: { competitionId?: string; studentId?: string }) =>
    add("eligibility", "eligibility", data),
  duplicateDetection: (data: { competitionId: string }) => add("duplicateDetection", "check", data),
  verification: (data: { competitionId: string }) => add("verification", "verify", data),
  assistant: (data: { userId: string; message: string; kind?: "student" | "admin" }) =>
    add("assistant", "chat", data),
  notifications: (data: Record<string, unknown>) => add("notifications", "send", data),
};

export { driver as queueDriver };
