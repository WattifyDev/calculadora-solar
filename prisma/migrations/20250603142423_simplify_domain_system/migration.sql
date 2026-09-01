/*
  Warnings:

  - You are about to drop the `AllowedDomain` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AllowedDomain" DROP CONSTRAINT "AllowedDomain_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "domain" TEXT;

-- DropTable
DROP TABLE "AllowedDomain";

-- CreateTable
CREATE TABLE "UserMaterialMargin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "margin" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "UserMaterialMargin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMaterialMargin_userId_materialId_key" ON "UserMaterialMargin"("userId", "materialId");

-- AddForeignKey
ALTER TABLE "UserMaterialMargin" ADD CONSTRAINT "UserMaterialMargin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMaterialMargin" ADD CONSTRAINT "UserMaterialMargin_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
