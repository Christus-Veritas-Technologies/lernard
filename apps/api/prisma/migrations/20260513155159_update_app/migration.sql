-- AlterTable
ALTER TABLE "ProjectDraft" ALTER COLUMN "context" DROP NOT NULL;

-- CreateTable
CREATE TABLE "WhatsAppSession" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "userId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'UNAUTHENTICATED',
    "stateData" JSONB,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppSession_phoneNumber_key" ON "WhatsAppSession"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppSession_userId_key" ON "WhatsAppSession"("userId");

-- CreateIndex
CREATE INDEX "WhatsAppSession_phoneNumber_idx" ON "WhatsAppSession"("phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppSession_userId_idx" ON "WhatsAppSession"("userId");

-- AddForeignKey
ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
