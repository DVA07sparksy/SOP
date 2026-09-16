// AI worker pool entrypoint. All agent logic lives in @sop/shared (so the API
// and worker share one implementation); this app only wires the queue driver
// and keeps the process alive.

import { startWorkers } from "@sop/shared";

const driver = startWorkers();

// eslint-disable-next-line no-console
console.log(
  `[ai-worker] started (QUEUE_DRIVER=${process.env.QUEUE_DRIVER ?? (process.env.REDIS_URL ? "redis" : "memory")}), listening on all agent queues`
);

// BullMQ workers keep the event loop busy; for the memory driver we hold the
// process open explicitly so `npm run dev:worker` behaves the same either way.
setInterval(() => {}, 60_000);

process.on("SIGINT", async () => {
  await driver.close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await driver.close();
  process.exit(0);
});
