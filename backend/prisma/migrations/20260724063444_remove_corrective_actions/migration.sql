/*
  Warnings:

  - You are about to drop the `corrective_actions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."corrective_actions" DROP CONSTRAINT "corrective_actions_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "public"."corrective_actions" DROP CONSTRAINT "corrective_actions_closed_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."corrective_actions" DROP CONSTRAINT "corrective_actions_company_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."corrective_actions" DROP CONSTRAINT "corrective_actions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."corrective_actions" DROP CONSTRAINT "corrective_actions_site_id_fkey";

-- DropTable
DROP TABLE "public"."corrective_actions";

-- DropEnum
DROP TYPE "public"."CapaPriority";

-- DropEnum
DROP TYPE "public"."CapaStatus";
