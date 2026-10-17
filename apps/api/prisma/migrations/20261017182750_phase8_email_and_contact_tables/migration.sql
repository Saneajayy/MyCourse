-- CreateEnum
CREATE TYPE "EmailLogStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'BOUNCED', 'COMPLAINED');

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" UUID NOT NULL,
    "template" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailLogStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT,
    "userId" UUID,
    "orderId" UUID,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "lastAttemptAt" TIMESTAMPTZ,
    "sentAt" TIMESTAMPTZ,
    "failedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSuppression" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ipAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_idempotencyKey_key" ON "EmailLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailLog_recipient_idx" ON "EmailLog"("recipient");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_userId_idx" ON "EmailLog"("userId");

-- CreateIndex
CREATE INDEX "EmailLog_orderId_idx" ON "EmailLog"("orderId");

-- CreateIndex
CREATE INDEX "EmailLog_providerMessageId_idx" ON "EmailLog"("providerMessageId");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSuppression_email_key" ON "EmailSuppression"("email");

-- CreateIndex
CREATE INDEX "EmailSuppression_email_idx" ON "EmailSuppression"("email");

-- CreateIndex
CREATE INDEX "ContactSubmission_email_idx" ON "ContactSubmission"("email");

-- CreateIndex
CREATE INDEX "ContactSubmission_status_idx" ON "ContactSubmission"("status");

-- CreateIndex
CREATE INDEX "ContactSubmission_createdAt_idx" ON "ContactSubmission"("createdAt");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
