-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "debriefText" TEXT,
ADD COLUMN     "reviewQuestions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "revisitSoonTopics" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "strongTopics" JSONB NOT NULL DEFAULT '[]';
