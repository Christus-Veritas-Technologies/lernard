-- AlterTable
ALTER TABLE "ChildInvite" ADD COLUMN     "childEmail" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "appearance" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
