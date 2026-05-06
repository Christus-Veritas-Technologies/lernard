/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `completed` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `confidenceRating` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedReadMs` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `idempotencyKey` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `answers` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `completed` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `idempotencyKey` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `length` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `questions` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the `ChatMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IdempotencyRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SessionRecord` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `title` on table `Conversation` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Lesson` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Made the column `score` on table `Quiz` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "QuizQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT_ANSWER', 'ORDERING');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "SessionRecord" DROP CONSTRAINT "SessionRecord_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "SessionRecord" DROP CONSTRAINT "SessionRecord_quizId_fkey";

-- DropForeignKey
ALTER TABLE "SessionRecord" DROP CONSTRAINT "SessionRecord_userId_fkey";

-- DropIndex
DROP INDEX "Conversation_deletedAt_idx";

-- DropIndex
DROP INDEX "Conversation_userId_idx";

-- DropIndex
DROP INDEX "Lesson_deletedAt_idx";

-- DropIndex
DROP INDEX "Lesson_idempotencyKey_key";

-- DropIndex
DROP INDEX "Lesson_userId_idx";

-- DropIndex
DROP INDEX "Lesson_userId_subjectId_idx";

-- DropIndex
DROP INDEX "Quiz_deletedAt_idx";

-- DropIndex
DROP INDEX "Quiz_idempotencyKey_key";

-- DropIndex
DROP INDEX "Quiz_userId_idx";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "deletedAt",
DROP COLUMN "summary",
ADD COLUMN     "lastMessage" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "title" SET NOT NULL;

-- AlterTable
ALTER TABLE "Guardian" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "completed",
DROP COLUMN "confidenceRating",
DROP COLUMN "content",
DROP COLUMN "deletedAt",
DROP COLUMN "estimatedReadMs",
DROP COLUMN "idempotencyKey",
ADD COLUMN     "estimatedMinutes" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "sectionChecks" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "sections" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "status" "GenerationStatus" NOT NULL DEFAULT 'GENERATING',
ADD COLUMN     "subjectName" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "answers",
DROP COLUMN "completed",
DROP COLUMN "deletedAt",
DROP COLUMN "idempotencyKey",
DROP COLUMN "length",
DROP COLUMN "questions",
ADD COLUMN     "currentIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fromConversationId" TEXT,
ADD COLUMN     "fromLessonId" TEXT,
ADD COLUMN     "mode" "LearningMode" NOT NULL DEFAULT 'GUIDE',
ADD COLUMN     "status" "GenerationStatus" NOT NULL DEFAULT 'GENERATING',
ADD COLUMN     "subjectName" TEXT,
ADD COLUMN     "totalQuestions" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "score" SET NOT NULL,
ALTER COLUMN "score" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleId" TEXT;

-- DropTable
DROP TABLE "ChatMessage";

-- DropTable
DROP TABLE "IdempotencyRecord";

-- DropTable
DROP TABLE "SessionRecord";

-- DropEnum
DROP TYPE "QuestionType";

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "otpHash" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "type" "QuizQuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SessionType" NOT NULL,
    "lessonId" TEXT,
    "quizId" TEXT,
    "subjectName" TEXT,
    "topic" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "blocks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_tokenHash_key" ON "MagicLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MagicLinkToken_email_idx" ON "MagicLinkToken"("email");

-- CreateIndex
CREATE INDEX "MagicLinkToken_tokenHash_idx" ON "MagicLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MagicLinkToken_expiresAt_idx" ON "MagicLinkToken"("expiresAt");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_quizId_questionIndex_key" ON "QuizQuestion"("quizId", "questionIndex");

-- CreateIndex
CREATE INDEX "QuizAnswer_quizId_idx" ON "QuizAnswer"("quizId");

-- CreateIndex
CREATE INDEX "QuizAnswer_userId_idx" ON "QuizAnswer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswer_quizId_questionIndex_key" ON "QuizAnswer"("quizId", "questionIndex");

-- CreateIndex
CREATE INDEX "Session_userId_completedAt_idx" ON "Session"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "Session_type_idx" ON "Session"("type");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Lesson_userId_createdAt_idx" ON "Lesson"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Lesson_status_idx" ON "Lesson"("status");

-- CreateIndex
CREATE INDEX "Quiz_userId_createdAt_idx" ON "Quiz"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Quiz_status_idx" ON "Quiz"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_fromLessonId_fkey" FOREIGN KEY ("fromLessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
