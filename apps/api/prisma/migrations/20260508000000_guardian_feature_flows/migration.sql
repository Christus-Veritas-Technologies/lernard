-- Guardian Feature Flows Migration
-- 1. Replace CompanionControls toggles with spec-defined controls
-- 2. Add User fields for Path B (child account activation)
-- 3. Add ChildInvite fields for type/status tracking

-- CompanionControls: remove old toggle fields, add spec fields
ALTER TABLE "CompanionControls" DROP COLUMN IF EXISTS "showCorrectAnswers";
ALTER TABLE "CompanionControls" DROP COLUMN IF EXISTS "allowHints";
ALTER TABLE "CompanionControls" DROP COLUMN IF EXISTS "allowSkip";
ALTER TABLE "CompanionControls" ADD COLUMN IF NOT EXISTS "answerRevealTiming" TEXT NOT NULL DEFAULT 'after_quiz';
ALTER TABLE "CompanionControls" ADD COLUMN IF NOT EXISTS "quizPassThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7;

-- User: add Path B activation fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "setupToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "setupTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "setupReminderSentAt" TIMESTAMP(3);

-- User: unique index on setupToken
CREATE UNIQUE INDEX IF NOT EXISTS "User_setupToken_key" ON "User"("setupToken");

-- ChildInvite: add type/status/childId fields
ALTER TABLE "ChildInvite" ADD COLUMN IF NOT EXISTS "childId" TEXT;
ALTER TABLE "ChildInvite" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'existing_account';
ALTER TABLE "ChildInvite" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';

-- ChildInvite: composite index for guardian + status lookups
CREATE INDEX IF NOT EXISTS "ChildInvite_guardianId_status_idx" ON "ChildInvite"("guardianId", "status");
