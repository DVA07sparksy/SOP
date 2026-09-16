/*
  Warnings:

  - You are about to drop the column `result` on the `Achievement` table. All the data in the column will be lost.
  - Added the required column `title` to the `Achievement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "CoordinatorMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "sectors" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoordinatorMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoordinatorMembership_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionnaireResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuestionnaireResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "competitionId" TEXT,
    "ownerId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Team_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "joinedAt" DATETIME,
    CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AchievementEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "achievementId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AchievementEvidence_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "competitionId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'STUDENT',
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "title" TEXT NOT NULL,
    "placement" TEXT,
    "achievedAt" DATETIME,
    "certificateUrl" TEXT,
    "prizeDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Achievement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Achievement_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Achievement" ("certificateUrl", "competitionId", "createdAt", "id", "prizeDescription", "studentId") SELECT "certificateUrl", "competitionId", "createdAt", "id", "prizeDescription", "studentId" FROM "Achievement";
DROP TABLE "Achievement";
ALTER TABLE "new_Achievement" RENAME TO "Achievement";
CREATE TABLE "new_Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "followed" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT,
    "notes" TEXT,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Application_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Application" ("competitionId", "createdAt", "id", "status", "studentId", "submittedAt", "updatedAt") SELECT "competitionId", "createdAt", "id", "status", "studentId", "submittedAt", "updatedAt" FROM "Application";
DROP TABLE "Application";
ALTER TABLE "new_Application" RENAME TO "Application";
CREATE INDEX "Application_status_idx" ON "Application"("status");
CREATE UNIQUE INDEX "Application_studentId_competitionId_key" ON "Application"("studentId", "competitionId");
CREATE TABLE "new_Competition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "title" TEXT NOT NULL,
    "organizer" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "eligibilityRawText" TEXT,
    "eligibilityRules" TEXT,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "educationLevels" TEXT NOT NULL,
    "countries" TEXT NOT NULL,
    "deadline" DATETIME,
    "registrationOpensAt" DATETIME,
    "competitionDate" DATETIME,
    "format" TEXT NOT NULL DEFAULT 'ONLINE',
    "location" TEXT,
    "cost" TEXT,
    "costAmount" REAL,
    "costCurrency" TEXT,
    "benefits" TEXT NOT NULL,
    "difficulty" TEXT,
    "individualOrTeam" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "teamSizeMax" INTEGER,
    "stages" TEXT,
    "requiredDocuments" TEXT,
    "preparationResources" TEXT,
    "editionYear" INTEGER,
    "officialUrl" TEXT,
    "applicationUrl" TEXT,
    "sourceId" TEXT,
    "rawPageId" TEXT,
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "trustStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "lastVerifiedAt" DATETIME,
    "aiConfidence" REAL,
    "duplicateOfId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    CONSTRAINT "Competition_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Competition_rawPageId_fkey" FOREIGN KEY ("rawPageId") REFERENCES "RawPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Competition_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Competition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Competition" ("ageMax", "ageMin", "aiConfidence", "applicationUrl", "benefits", "category", "competitionDate", "cost", "countries", "createdAt", "deadline", "description", "difficulty", "duplicateOfId", "educationLevels", "eligibilityRawText", "eligibilityRules", "format", "id", "lastVerifiedAt", "location", "officialUrl", "organizer", "publishedAt", "rawPageId", "registrationOpensAt", "sourceId", "status", "title", "trustScore", "trustStatus", "updatedAt") SELECT "ageMax", "ageMin", "aiConfidence", "applicationUrl", "benefits", "category", "competitionDate", "cost", "countries", "createdAt", "deadline", "description", "difficulty", "duplicateOfId", "educationLevels", "eligibilityRawText", "eligibilityRules", "format", "id", "lastVerifiedAt", "location", "officialUrl", "organizer", "publishedAt", "rawPageId", "registrationOpensAt", "sourceId", "status", "title", "trustScore", "trustStatus", "updatedAt" FROM "Competition";
DROP TABLE "Competition";
ALTER TABLE "new_Competition" RENAME TO "Competition";
CREATE INDEX "Competition_status_idx" ON "Competition"("status");
CREATE INDEX "Competition_deadline_idx" ON "Competition"("deadline");
CREATE TABLE "new_Institution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "ownership" TEXT NOT NULL DEFAULT 'GOVERNMENT',
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Institution" ("country", "createdAt", "id", "name", "region", "type", "updatedAt", "verificationStatus") SELECT "country", "createdAt", "id", "name", "region", "type", "updatedAt", "verificationStatus" FROM "Institution";
DROP TABLE "Institution";
ALTER TABLE "new_Institution" RENAME TO "Institution";
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "educationLevel" TEXT NOT NULL,
    "fieldOfStudy" TEXT NOT NULL,
    "interests" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "careerInterests" TEXT NOT NULL DEFAULT '[]',
    "academicAverage" REAL,
    "age" INTEGER,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "preferredFormats" TEXT NOT NULL,
    "institutionRequest" TEXT,
    "institutionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Student_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("age", "city", "country", "createdAt", "educationLevel", "fieldOfStudy", "fullName", "id", "institutionId", "interests", "preferredFormats", "region", "skills", "updatedAt", "userId") SELECT "age", "city", "country", "createdAt", "educationLevel", "fieldOfStudy", "fullName", "id", "institutionId", "interests", "preferredFormats", "region", "skills", "updatedAt", "userId" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
CREATE INDEX "Student_country_region_idx" ON "Student"("country", "region");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CoordinatorMembership_userId_institutionId_key" ON "CoordinatorMembership"("userId", "institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireResponse_studentId_key" ON "QuestionnaireResponse"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_inviteCode_key" ON "Team"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
