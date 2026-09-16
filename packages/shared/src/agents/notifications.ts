// Notifications worker (architecture doc §30): consumes notification jobs
// (deadline reminders etc.). The channel adapter (email/push) is the only
// stub point — swap in Resend/Postmark without touching anything else.

import { enqueue } from "../enqueue";

export interface DeadlineReminderJob {
  email: string;
  competitionTitle: string;
  deadline: Date | string;
}

export async function runNotifications(data: DeadlineReminderJob) {
  // STUB: transactional-email provider call (Resend/Postmark). Everything
  // upstream (who, when, what) is real and queue-driven.
  // eslint-disable-next-line no-console
  console.log(
    `[notifications] would email ${data.email}: "${data.competitionTitle}" deadline ${new Date(data.deadline).toDateString()}`
  );
  return { sent: true };
}

// Queues deadline reminders for applications in active states. Called by the
// admin cron endpoint (POST /notifications/run-deadline-digest).
export async function queueDeadlineReminders(lookaheadDays = 3) {
  const { prisma } = await import("@sop/db");
  const soon = new Date(Date.now() + lookaheadDays * 24 * 60 * 60 * 1000);
  const upcoming = await prisma.competition.findMany({
    where: { status: "PUBLISHED", deadline: { gt: new Date(), lt: soon } },
  });

  let queued = 0;
  for (const competition of upcoming) {
    const applications = await prisma.application.findMany({
      where: { competitionId: competition.id, status: { in: ["SAVED", "INTERESTED", "STARTED", "APPLIED"] } },
      include: { student: { include: { user: true } } },
    });
    for (const app of applications) {
      if (!competition.deadline) continue;
      await enqueue.notifications({
        email: app.student.user.email,
        competitionTitle: competition.title,
        deadline: competition.deadline,
      } satisfies DeadlineReminderJob);
      queued++;
    }
  }
  return { queued, competitions: upcoming.length };
}
