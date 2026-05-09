/*
  Warnings:

  - The values [GENERATING] on the enum `GenerationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaperType" AS ENUM ('PAPER1', 'PAPER2');

-- CreateEnum
CREATE TYPE "QuizDifficulty" AS ENUM ('FOUNDATION', 'STANDARD', 'CHALLENGING', 'EXTENSION');

-- AlterEnum
BEGIN;
CREATE TYPE "GenerationStatus_new" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED');
ALTER TABLE "public"."Lesson" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Quiz" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Lesson" ALTER COLUMN "status" TYPE "GenerationStatus_new" USING ("status"::text::"GenerationStatus_new");
ALTER TABLE "Quiz" ALTER COLUMN "status" TYPE "GenerationStatus_new" USING ("status"::text::"GenerationStatus_new");
ALTER TYPE "GenerationStatus" RENAME TO "GenerationStatus_old";
ALTER TYPE "GenerationStatus_new" RENAME TO "GenerationStatus";
DROP TYPE "public"."GenerationStatus_old";
ALTER TABLE "Lesson" ALTER COLUMN "status" SET DEFAULT 'QUEUED';
ALTER TABLE "Quiz" ALTER COLUMN "status" SET DEFAULT 'QUEUED';
COMMIT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "readyAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'QUEUED';

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "difficulty" "QuizDifficulty" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "paperType" "PaperType" NOT NULL DEFAULT 'PAPER1',
ADD COLUMN     "readyAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'QUEUED';
