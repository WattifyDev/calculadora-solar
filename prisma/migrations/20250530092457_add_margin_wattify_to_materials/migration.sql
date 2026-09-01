-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpFrom" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "margin" DOUBLE PRECISION NOT NULL,
    "marginWattify" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "area" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowedDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "googleMapsApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllowedDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'spain',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "userName" TEXT,
    "userEmail" TEXT,
    "userPhone" TEXT,
    "hasUserInfo" BOOLEAN NOT NULL DEFAULT false,
    "userConsentGiven" BOOLEAN,
    "origin" TEXT,
    "pathname" TEXT,
    "googleSolarData" JSONB,
    "annualProduction" DOUBLE PRECISION,
    "dailyAverage" DOUBLE PRECISION,
    "efficiency" DOUBLE PRECISION,
    "sunHoursPerDay" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "costPerWatt" DOUBLE PRECISION,
    "systemSize" DOUBLE PRECISION,
    "panelCount" INTEGER,
    "totalRoofArea" DOUBLE PRECISION,
    "suitableRoofArea" DOUBLE PRECISION,
    "roofSuitability" DOUBLE PRECISION,
    "paybackYears" INTEGER,
    "roi" DOUBLE PRECISION,
    "firstYearSavings" DOUBLE PRECISION,
    "lifetimeSavings" DOUBLE PRECISION,
    "currencyCode" TEXT,
    "monthlyElectricityBillAmount" DOUBLE PRECISION,
    "averageKwhConsumption" DOUBLE PRECISION,
    "co2Reduction" DOUBLE PRECISION,
    "treesPlanted" INTEGER,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AllowedDomain_domain_key" ON "AllowedDomain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "AllowedDomain_apiKey_key" ON "AllowedDomain"("apiKey");

-- CreateIndex
CREATE INDEX "AllowedDomain_domain_idx" ON "AllowedDomain"("domain");

-- CreateIndex
CREATE INDEX "AllowedDomain_apiKey_idx" ON "AllowedDomain"("apiKey");

-- AddForeignKey
ALTER TABLE "AllowedDomain" ADD CONSTRAINT "AllowedDomain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
