-- CreateEnum
CREATE TYPE "RoundPhase" AS ENUM ('SUBMITTING', 'VOTING', 'REVEAL');

-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_gameId_fkey";

-- DropForeignKey
ALTER TABLE "Round" DROP CONSTRAINT "Round_gameId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_playerId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_roundId_fkey";

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "answerDeck" TEXT[],
ADD COLUMN     "promptDeck" TEXT[],
ADD COLUMN     "targetScore" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "hand" TEXT[],
ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "isHost" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "number" INTEGER NOT NULL,
ADD COLUMN     "phase" "RoundPhase" NOT NULL DEFAULT 'SUBMITTING';

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "votes";

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vote_roundId_voterId_key" ON "Vote"("roundId", "voterId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gameId_name_key" ON "Player"("gameId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Round_gameId_number_key" ON "Round"("gameId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_roundId_playerId_key" ON "Submission"("roundId", "playerId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

