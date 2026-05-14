-- CreateEnum
CREATE TYPE "PaymentSessionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CLAIMED');

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "status" "PaymentSessionStatus" NOT NULL DEFAULT 'PENDING',
    "validationErrors" JSONB NOT NULL DEFAULT '[]',
    "claimedAt" TIMESTAMP(3),
    "paymentOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentSession_userId_idx" ON "PaymentSession"("userId");

-- CreateIndex
CREATE INDEX "PaymentSession_status_idx" ON "PaymentSession"("status");

-- CreateIndex
CREATE INDEX "PaymentSession_userId_status_idx" ON "PaymentSession"("userId", "status");

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
