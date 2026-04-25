-- CreateEnum
CREATE TYPE "LearningGoal" AS ENUM ('EXAM_PREP', 'KEEP_UP', 'LEARN_NEW', 'FILL_GAPS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "learningGoal" "LearningGoal";
