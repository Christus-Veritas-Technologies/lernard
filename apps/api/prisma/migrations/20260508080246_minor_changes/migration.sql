-- AlterTable
ALTER TABLE "Guardian" ADD COLUMN     "contactPreference" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN     "dashboardDefault" TEXT NOT NULL DEFAULT 'overview',
ADD COLUMN     "unsubscribeAll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weeklyFamilySummary" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "growthAreaNudgeEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "growthAreaNudgeFrequency" TEXT NOT NULL DEFAULT 'daily',
ADD COLUMN     "planLimitAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminderTime" TEXT NOT NULL DEFAULT '07:00',
ADD COLUMN     "streakAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supportLevel" TEXT NOT NULL DEFAULT 'moderate',
ADD COLUMN     "textSize" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "weeklyEmailEnabled" BOOLEAN NOT NULL DEFAULT true;
