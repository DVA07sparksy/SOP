import { Router } from "express";
import { Queue, QueueEvents } from "bullmq";
import { z } from "zod";
import { QueueNames } from "@sop/shared";
import { AuthedRequest, requireAuth } from "../../middleware/auth";
import { getAssistantQueueEvents, isRedisQueue } from "../../lib/queues";
import { runAssistant } from "@sop/shared";

export const assistantRouter = Router();

const messageSchema = z.object({ message: z.string().min(1).max(2000) });

let assistantQueue: Queue | null = null;
function getAssistantQueue(): Queue {
  if (!assistantQueue) {
    const { getRedisConnection } = require("@sop/shared/dist/redisConnection");
    assistantQueue = new Queue(QueueNames.assistant, { connection: getRedisConnection() });
  }
  return assistantQueue;
}

assistantRouter.post("/chat", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = messageSchema.parse(req.body);

    if (isRedisQueue()) {
      // Production: enqueue a BullMQ job and wait for the worker to finish.
      const job = await getAssistantQueue().add("chat", {
        userId: req.user!.id,
        message: body.message,
        kind: "student",
      });
      const queueEvents: QueueEvents = getAssistantQueueEvents();
      const result = await job.waitUntilFinished(queueEvents, 30_000);
      return res.json(result);
    }

    // Memory mode: answer inline through the exact same agent the worker runs.
    const result = await runAssistant({ userId: req.user!.id, message: body.message, kind: "student" });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
