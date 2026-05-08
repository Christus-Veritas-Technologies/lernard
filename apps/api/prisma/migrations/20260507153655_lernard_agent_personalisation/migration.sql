-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "confidenceRating" INTEGER;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "weakTopics" JSONB NOT NULL DEFAULT '[]';
