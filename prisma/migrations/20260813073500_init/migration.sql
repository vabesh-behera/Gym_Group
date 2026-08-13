-- CreateEnum
CREATE TYPE "MechanicCategory" AS ENUM ('ACQUISITION', 'UTILISATION');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('GENERAL', 'STUDENT', 'CORPORATE', 'HYBRID_WORKER', 'LAPSED_MEMBER', 'ENGAGED_MEMBER');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('RECOMMENDED', 'NEEDS_ATTENTION', 'ACCEPTED', 'REJECTED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('MAXIMISE_INCREMENTAL_JOINS', 'FILL_OFF_PEAK_CAPACITY', 'IMPROVE_MEMBER_LIFETIME_CONTRIBUTION', 'REACTIVATE_DORMANT_MEMBERS', 'SUPPORT_NEW_OR_REFURBISHED_GYM', 'DEFEND_SITE_AGAINST_COMPETITOR');

-- CreateEnum
CREATE TYPE "MemberEventType" AS ENUM ('JOIN', 'CHURN', 'REACTIVATE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'WARNING', 'INSIGHT');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ExternalSignalType" AS ENUM ('COMPETITOR', 'WEATHER', 'HOLIDAY', 'EVENT', 'TREND');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ChangeLogType" AS ENUM ('COMPETITOR_PRICE', 'COMPETITOR_OFFER', 'COMPETITOR_OPENING', 'INTERNAL_CAMPAIGN_EDIT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Portfolio Manager',
    "initials" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "catchmentArea" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "peakCapacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mechanic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "howItWorks" TEXT NOT NULL,
    "category" "MechanicCategory" NOT NULL,
    "businessObjective" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mechanic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" "CampaignObjective" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'RECOMMENDED',
    "audienceType" "AudienceType" NOT NULL,
    "mechanicId" TEXT NOT NULL,
    "clubId" TEXT,
    "regionId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "incentiveValue" DOUBLE PRECISION NOT NULL,
    "offPeakOnly" BOOLEAN NOT NULL DEFAULT false,
    "predictedJoins" INTEGER NOT NULL,
    "predictedRoi" DOUBLE PRECISION NOT NULL,
    "predictedRetention" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "aiRationale" TEXT NOT NULL,
    "minRoiGuardrail" DOUBLE PRECISION,
    "maxPeakOccupancyGuardrail" DOUBLE PRECISION,
    "actualJoins" INTEGER,
    "actualRoi" DOUBLE PRECISION,
    "healthScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioMonthlyMetric" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "investment" DOUBLE PRECISION NOT NULL,
    "incrementalRevenue" DOUBLE PRECISION NOT NULL,
    "joins" INTEGER NOT NULL,
    "roi" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioMonthlyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubUtilization" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "utilisationPct" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ClubUtilization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberEvent" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "campaignId" TEXT,
    "type" "MemberEventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isIncremental" BOOLEAN NOT NULL DEFAULT false,
    "revenueImpact" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "MemberEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impactValue" DOUBLE PRECISION NOT NULL,
    "impactLabel" TEXT NOT NULL,
    "clubId" TEXT,
    "regionId" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSignal" (
    "id" TEXT NOT NULL,
    "type" "ExternalSignalType" NOT NULL,
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ExternalSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLogEntry" (
    "id" TEXT NOT NULL,
    "type" "ChangeLogType" NOT NULL,
    "entityRef" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");

-- CreateIndex
CREATE INDEX "Club_regionId_idx" ON "Club"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Mechanic_name_key" ON "Mechanic"("name");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_clubId_idx" ON "Campaign"("clubId");

-- CreateIndex
CREATE INDEX "Campaign_regionId_idx" ON "Campaign"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioMonthlyMetric_month_key" ON "PortfolioMonthlyMetric"("month");

-- CreateIndex
CREATE INDEX "ClubUtilization_clubId_idx" ON "ClubUtilization"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubUtilization_clubId_dayOfWeek_hour_key" ON "ClubUtilization"("clubId", "dayOfWeek", "hour");

-- CreateIndex
CREATE INDEX "MemberEvent_clubId_idx" ON "MemberEvent"("clubId");

-- CreateIndex
CREATE INDEX "MemberEvent_campaignId_idx" ON "MemberEvent"("campaignId");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_idx" ON "ChatMessage"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "Mechanic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubUtilization" ADD CONSTRAINT "ClubUtilization_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberEvent" ADD CONSTRAINT "MemberEvent_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberEvent" ADD CONSTRAINT "MemberEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
