-- AlterEnum
ALTER TYPE "RoundKind" ADD VALUE 'IMAGE';

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "imageEvery" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "imageHand" TEXT[];

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "imageCardId" TEXT;

-- CreateTable
CREATE TABLE "ImageCard" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageCard_path_key" ON "ImageCard"("path");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_imageCardId_fkey" FOREIGN KEY ("imageCardId") REFERENCES "ImageCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
