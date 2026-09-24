-- AlterTable
ALTER TABLE "utilisateur" ADD COLUMN     "codes_secours" TEXT,
ADD COLUMN     "otp_actif" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otp_secret" VARCHAR(64);
