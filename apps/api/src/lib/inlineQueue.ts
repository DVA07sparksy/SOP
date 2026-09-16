// Inline-worker policy: with QUEUE_DRIVER=memory the queue is process-local,
// so a separate worker app can never consume its jobs — the API must host
// them itself. Default: on for memory mode, off for redis mode (the
// ai-worker app consumes there). Override with RUN_INLINE_WORKERS=true|false.

import { enqueue } from "@sop/shared";

let inlineWorkersStarted = false;

export async function startInlineWorkersIfConfigured(): Promise<void> {
  if (inlineWorkersStarted) return;
  const driver = process.env.QUEUE_DRIVER ?? (process.env.REDIS_URL ? "redis" : "memory");
  const flag = process.env.RUN_INLINE_WORKERS;
  const shouldStart = flag === "true" || (flag === undefined && driver === "memory");
  if (shouldStart) {
    const { startWorkers } = await import("@sop/shared");
    startWorkers();
    inlineWorkersStarted = true;
    // eslint-disable-next-line no-console
    console.log(`[api] inline workers started (QUEUE_DRIVER=${driver})`);
  }
}

export async function eligibilityQueueOrInline(data: { competitionId?: string; studentId?: string }) {
  await enqueue.eligibility(data);
}
