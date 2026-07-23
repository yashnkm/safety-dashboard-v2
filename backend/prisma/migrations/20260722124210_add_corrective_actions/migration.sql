-- CreateEnum
CREATE TYPE "CapaStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "CapaPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "corrective_actions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "site_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "linked_parameter" TEXT,
    "linked_month" TEXT,
    "linked_year" INTEGER,
    "priority" "CapaPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "CapaStatus" NOT NULL DEFAULT 'OPEN',
    "due_date" TIMESTAMP(3),
    "root_cause" TEXT,
    "corrective_action" TEXT,
    "closure_notes" TEXT,
    "assigned_to" TEXT,
    "created_by" TEXT,
    "closed_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "corrective_actions_company_id_idx" ON "corrective_actions"("company_id");

-- CreateIndex
CREATE INDEX "corrective_actions_site_id_idx" ON "corrective_actions"("site_id");

-- CreateIndex
CREATE INDEX "corrective_actions_status_idx" ON "corrective_actions"("status");

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
