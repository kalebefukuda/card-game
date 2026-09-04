-- CreateEnum
CREATE TYPE "RoundKind" AS ENUM ('TEXT', 'SOUND');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "soundHand" TEXT[];

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "kind" "RoundKind" NOT NULL DEFAULT 'TEXT';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "soundCardId" TEXT;

-- CreateTable
CREATE TABLE "SoundCard" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "gain" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoundCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SoundCard_path_key" ON "SoundCard"("path");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_soundCardId_fkey" FOREIGN KEY ("soundCardId") REFERENCES "SoundCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
