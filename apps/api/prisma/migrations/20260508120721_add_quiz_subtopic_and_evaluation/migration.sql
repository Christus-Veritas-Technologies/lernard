-- AlterTable
ALTER TABLE "QuizAnswer" ADD COLUMN     "evaluationResult" TEXT,
ADD COLUMN     "feedback" TEXT;

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "subtopic" TEXT;
