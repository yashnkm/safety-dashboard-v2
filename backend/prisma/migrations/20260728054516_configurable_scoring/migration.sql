-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "scoring_directions" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "status_excellent_at" DECIMAL(5,2) NOT NULL DEFAULT 90.0,
ADD COLUMN     "status_good_at" DECIMAL(5,2) NOT NULL DEFAULT 70.0;
