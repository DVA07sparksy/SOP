// Worker bootstrap: registers every agent handler on the active queue driver
// (redis via BullMQ, or in-process memory). The ai-worker app is a thin
// entrypoint calling startWorkers(); the API can do the same in
// QUEUE_DRIVER=memory setups (single-process dev mode).

import { getQueueDriver, QueueNames } from "./queues";
import { runDiscovery } from "./agents/discovery";
import { runExtraction } from "./agents/extraction";
import { runDuplicateDetection } from "./agents/duplicateDetection";
import { runEligibility } from "./agents/eligibility";
import { runVerification } from "./agents/verification";
import { runAssistant } from "./agents/assistant";
import { runNotifications } from "./agents/notifications";

export function startWorkers() {
  const driver = getQueueDriver(); // same singleton the enqueue facade uses

  driver.process(QueueNames.crawl, runDiscovery, { concurrency: 3 });
  driver.process(QueueNames.extraction, runExtraction, { concurrency: 3 });
  driver.process(QueueNames.duplicateDetection, runDuplicateDetection, { concurrency: 5 });
  driver.process(QueueNames.eligibility, runEligibility, { concurrency: 5 });
  driver.process(QueueNames.verification, runVerification, { concurrency: 3 });
  driver.process(QueueNames.assistant, runAssistant, { concurrency: 10 });
  driver.process(QueueNames.notifications, runNotifications, { concurrency: 10 });

  return driver;
}
