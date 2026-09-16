import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Uses a raw PrismaClient (not the @sop/db wrapper) so the script works from
// any cwd and never depends on app-level env loading.
const prisma = new PrismaClient();

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function main() {
  console.log("Seeding database...");

  const source = await prisma.source.upsert({
    where: { url: "https://example-olympiad.org" },
    update: { organization: "Example Olympiad Org", reliabilityScore: 90 },
    create: { url: "https://example-olympiad.org", organization: "Example Olympiad Org", reliabilityScore: 90 },
  });

  // Idempotency anchor: stable official URLs double as natural keys for demos.
  const published = [
    {
      title: "African Mathematics Olympiad 2027",
      organizer: "Pan-African STEM Council",
      category: JSON.stringify(["mathematics", "olympiad"]),
      description:
        "Annual olympiad for secondary-school students across Africa. Individual and team rounds, culminating in an in-person final.",
      eligibilityRawText:
        "Open to students aged 15-19 enrolled in secondary school in African countries at the time of registration.",
      eligibilityRules: JSON.stringify({
        ageMin: 15,
        ageMax: 19,
        educationLevels: ["SECONDARY"],
        countries: ["Cameroon", "Nigeria", "Kenya", "Ghana"],
      }),
      educationLevels: JSON.stringify(["SECONDARY"]),
      countries: JSON.stringify(["Cameroon", "Nigeria", "Kenya", "Ghana"]),
      deadline: daysFromNow(45),
      format: "ONLINE",
      cost: "free",
      costAmount: 0,
      costCurrency: "XAF",
      benefits: JSON.stringify(["certificate", "medal", "scholarship"]),
      difficulty: "ADVANCED",
      individualOrTeam: "BOTH",
      teamSizeMax: 4,
      stages: JSON.stringify([
        { name: "Registration closes", date: daysFromNow(45).toISOString() },
        { name: "Qualifier round (online)", date: daysFromNow(60).toISOString() },
        { name: "Final round (in person)", date: daysFromNow(90).toISOString() },
      ]),
      requiredDocuments: JSON.stringify(["Student ID", "Parental consent (under 18)"]),
      preparationResources: JSON.stringify([
        { title: "Past qualifier papers", url: "https://example-olympiad.org/africa-math/past-papers", official: true },
        { title: "Official syllabus", url: "https://example-olympiad.org/africa-math/syllabus", official: true },
      ]),
      editionYear: 2027,
      officialUrl: "https://example-olympiad.org/africa-math",
      applicationUrl: "https://example-olympiad.org/africa-math/apply",
      sourceId: source.id,
      trustScore: 92,
      trustStatus: "APPROVED",
      lastVerifiedAt: new Date(),
      publishedAt: new Date(),
      status: "PUBLISHED",
    },
    {
      title: "Global AI Challenge for University Students",
      organizer: "OpenLearn Foundation",
      category: JSON.stringify(["AI", "machine learning", "programming"]),
      description:
        "A 6-week online challenge: build an ML solution to a real-world problem. Open to undergraduates and graduate students worldwide.",
      eligibilityRawText: "Open to undergraduate and graduate students worldwide. Teams of up to four.",
      eligibilityRules: JSON.stringify({
        ageMin: null,
        ageMax: null,
        educationLevels: ["UNIVERSITY", "GRADUATE"],
        countries: [],
      }),
      educationLevels: JSON.stringify(["UNIVERSITY", "GRADUATE"]),
      countries: JSON.stringify([]),
      deadline: daysFromNow(20),
      format: "ONLINE",
      cost: "free",
      costAmount: 0,
      costCurrency: "USD",
      benefits: JSON.stringify(["cash_prize", "internship", "certificate"]),
      difficulty: "HIGHLY_COMPETITIVE",
      individualOrTeam: "TEAM",
      teamSizeMax: 4,
      stages: JSON.stringify([
        { name: "Team registration", date: daysFromNow(20).toISOString() },
        { name: "Build phase (6 weeks)", date: daysFromNow(62).toISOString() },
        { name: "Finals demo day", date: daysFromNow(70).toISOString() },
      ]),
      requiredDocuments: JSON.stringify(["CV", "University enrollment proof"]),
      preparationResources: JSON.stringify([
        { title: "Starter notebook + dataset", url: "https://example.org/ai-challenge/starter", official: true },
      ]),
      editionYear: 2026,
      officialUrl: "https://example.org/ai-challenge",
      applicationUrl: "https://example.org/ai-challenge/apply",
      sourceId: source.id,
      trustScore: 88,
      trustStatus: "APPROVED",
      lastVerifiedAt: new Date(),
      publishedAt: new Date(),
      status: "PUBLISHED",
    },
    {
      title: "National Programming Championship (Cameroon)",
      organizer: "Cameroon Digital Skills Initiative",
      category: JSON.stringify(["programming", "algorithmics"]),
      description: "National algorithmic programming contest with university and secondary tracks.",
      eligibilityRawText: "Open to students enrolled in a Cameroonian secondary school or university.",
      eligibilityRules: JSON.stringify({
        ageMin: null,
        ageMax: null,
        educationLevels: ["SECONDARY", "UNIVERSITY"],
        countries: ["Cameroon"],
      }),
      educationLevels: JSON.stringify(["SECONDARY", "UNIVERSITY"]),
      countries: JSON.stringify(["Cameroon"]),
      deadline: daysFromNow(60),
      format: "HYBRID",
      cost: "free",
      costAmount: 0,
      costCurrency: "XAF",
      benefits: JSON.stringify(["certificate", "cash_prize", "training_camp"]),
      difficulty: "COMPETITIVE",
      individualOrTeam: "INDIVIDUAL",
      stages: JSON.stringify([
        { name: "Registration", date: daysFromNow(60).toISOString() },
        { name: "Regional qualifiers", date: daysFromNow(75).toISOString() },
        { name: "National final (Yaoundé)", date: daysFromNow(95).toISOString() },
      ]),
      preparationResources: JSON.stringify([
        { title: "Practice problem archive", url: "https://example.cm/npc/practice", official: true },
      ]),
      editionYear: 2026,
      officialUrl: "https://example.cm/npc",
      applicationUrl: "https://example.cm/npc/register",
      sourceId: source.id,
      trustScore: 85,
      trustStatus: "APPROVED",
      lastVerifiedAt: new Date(),
      publishedAt: new Date(),
      status: "PUBLISHED",
    },
    {
      title: "Buea Debate Open",
      organizer: "Buea Schools Forum",
      category: JSON.stringify(["debate", "public speaking"]),
      description:
        "Regional debate competition for secondary students in the Southwest. Beginner-friendly — a great first competition.",
      eligibilityRawText: "Secondary school students in the Southwest Region.",
      eligibilityRules: JSON.stringify({
        ageMin: 12,
        ageMax: 20,
        educationLevels: ["SECONDARY"],
        countries: ["Cameroon"],
      }),
      educationLevels: JSON.stringify(["SECONDARY"]),
      countries: JSON.stringify(["Cameroon"]),
      deadline: daysFromNow(30),
      format: "OFFLINE",
      location: "Buea, Southwest Region",
      cost: "2000 XAF",
      costAmount: 2000,
      costCurrency: "XAF",
      benefits: JSON.stringify(["certificate", "trophy", "recognition"]),
      difficulty: "STARTER",
      individualOrTeam: "BOTH",
      teamSizeMax: 3,
      editionYear: 2026,
      officialUrl: "https://example.cm/buea-debate",
      applicationUrl: "https://example.cm/buea-debate/register",
      sourceId: source.id,
      trustScore: 78,
      trustStatus: "APPROVED",
      lastVerifiedAt: new Date(),
      publishedAt: new Date(),
      status: "PUBLISHED",
    },
  ];

  for (const data of published) {
    const existing = await prisma.competition.findFirst({ where: { officialUrl: data.officialUrl } });
    if (existing) {
      await prisma.competition.update({ where: { id: existing.id }, data });
    } else {
      await prisma.competition.create({ data });
    }
  }

  // One item left in the review queue so the admin flow is exercisable.
  const reviewItem = {
    title: "Regional Robotics Cup (unverified submission)",
    organizer: null,
    category: JSON.stringify(["robotics", "engineering"]),
    eligibilityRawText: "Open to secondary and university students in the Southwest region.",
    educationLevels: JSON.stringify(["SECONDARY", "UNIVERSITY"]),
    countries: JSON.stringify(["Cameroon"]),
    deadline: daysFromNow(10),
    format: "OFFLINE",
    cost: "5000 XAF",
    benefits: JSON.stringify(["trophy", "certificate"]),
    sourceId: source.id,
    trustScore: 61,
    trustStatus: "NEEDS_REVIEW",
    status: "NEEDS_REVIEW",
  };
  const existingReview = await prisma.competition.findFirst({
    where: { title: reviewItem.title, status: { not: "REJECTED" } },
  });
  if (!existingReview) await prisma.competition.create({ data: reviewItem });

  // ---- Demo accounts (REMOVE before production launch) ----
  const password = await bcrypt.hash("password123", 12);
  const adminPassword = await bcrypt.hash("admin12345", 12);

  // Government institution is pre-seeded and verified (doc §8).
  const institution = await prisma.institution.upsert({
    where: { id: "seed-inst-bhs" },
    update: {},
    create: {
      id: "seed-inst-bhs",
      name: "Buea Secondary High School",
      type: "SECONDARY",
      ownership: "GOVERNMENT",
      country: "Cameroon",
      region: "Southwest",
      city: "Buea",
      verificationStatus: "VERIFIED",
    },
  });

  const studentEmail = "student@example.com";
  await prisma.user.upsert({
    where: { email: studentEmail },
    update: {},
    create: {
      email: studentEmail,
      passwordHash: password,
      role: "STUDENT",
      student: {
        create: {
          fullName: "Ada Nkeng",
          educationLevel: "UNIVERSITY",
          fieldOfStudy: JSON.stringify(["computer science"]),
          interests: JSON.stringify(["AI", "machine learning", "mathematics", "robotics"]),
          skills: JSON.stringify(["programming"]),
          careerInterests: JSON.stringify(["software engineering"]),
          age: 20,
          country: "Cameroon",
          region: "Southwest",
          city: "Buea",
          institutionId: institution.id,
          preferredFormats: JSON.stringify(["ONLINE", "OFFLINE"]),
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", passwordHash: adminPassword, role: "PLATFORM_ADMIN" },
  });

  await prisma.user.upsert({
    where: { email: "worker@example.com" },
    update: {},
    create: { email: "worker@example.com", passwordHash: password, role: "WORKER" },
  });

  await prisma.user.upsert({
    where: { email: "coordinator@example.com" },
    update: {},
    create: {
      email: "coordinator@example.com",
      passwordHash: password,
      role: "COORDINATOR",
      coordinatorMembership: {
        create: {
          institutionId: institution.id,
          sectors: JSON.stringify(["programming", "mathematics"]),
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "school@example.com" },
    update: {},
    create: {
      email: "school@example.com",
      passwordHash: password,
      role: "INSTITUTION_ADMIN",
      institutionAdminOf: { connect: { id: institution.id } },
    },
  });

  console.log("Seed complete: 4 published competitions, 1 review-queue item, demo logins:");
  console.log("  student@example.com / password123     (student)");
  console.log("  school@example.com  / password123     (institution admin)");
  console.log("  coordinator@example.com / password123 (coordinator)");
  console.log("  worker@example.com  / password123     (reviewer)");
  console.log("  admin@example.com   / admin12345      (platform admin)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
