-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "profilePicture" TEXT,
    "otpCode" TEXT,
    "otpExpires" DATETIME,
    "refreshToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "durationInSeconds" INTEGER NOT NULL,
    "transcript" TEXT NOT NULL,
    "summary" TEXT,
    "keyPoints" TEXT,
    "actionItems" TEXT,
    "keyDecisions" TEXT,
    "questionsAndAnswers" TEXT,
    "sentiment" TEXT,
    "meetingStats" TEXT,
    "meetingOverview" TEXT,
    "risks" TEXT,
    "deadlines" TEXT,
    "folder" TEXT NOT NULL DEFAULT 'General',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Recording_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Recording_userId_idx" ON "Recording"("userId");

-- CreateIndex
CREATE INDEX "Recording_title_idx" ON "Recording"("title");
