-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('ALL_SITES', 'SPECIFIC_SITES');

-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_code" TEXT NOT NULL,
    "industry" TEXT,
    "address" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "site_name" TEXT NOT NULL,
    "site_code" TEXT NOT NULL,
    "site_type" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "manager_name" TEXT,
    "manager_email" TEXT,
    "manager_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "access_level" "AccessLevel" NOT NULL DEFAULT 'ALL_SITES',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_site_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_site_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_metrics" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "man_days_target" INTEGER NOT NULL DEFAULT 0,
    "man_days_actual" INTEGER NOT NULL DEFAULT 0,
    "man_days_score" DECIMAL(5,2),
    "safe_work_hours_target" INTEGER NOT NULL DEFAULT 0,
    "safe_work_hours_actual" INTEGER NOT NULL DEFAULT 0,
    "safe_work_hours_score" DECIMAL(5,2),
    "safety_induction_target" INTEGER NOT NULL DEFAULT 0,
    "safety_induction_actual" INTEGER NOT NULL DEFAULT 0,
    "safety_induction_score" DECIMAL(5,2),
    "tool_box_talk_target" INTEGER NOT NULL DEFAULT 0,
    "tool_box_talk_actual" INTEGER NOT NULL DEFAULT 0,
    "tool_box_talk_score" DECIMAL(5,2),
    "job_specific_training_target" INTEGER NOT NULL DEFAULT 0,
    "job_specific_training_actual" INTEGER NOT NULL DEFAULT 0,
    "job_specific_training_score" DECIMAL(5,2),
    "formal_safety_inspection_target" INTEGER NOT NULL DEFAULT 0,
    "formal_safety_inspection_actual" INTEGER NOT NULL DEFAULT 0,
    "formal_safety_inspection_score" DECIMAL(5,2),
    "non_compliance_raised_target" INTEGER NOT NULL DEFAULT 0,
    "non_compliance_raised_actual" INTEGER NOT NULL DEFAULT 0,
    "non_compliance_raised_score" DECIMAL(5,2),
    "non_compliance_close_target" INTEGER NOT NULL DEFAULT 0,
    "non_compliance_close_actual" INTEGER NOT NULL DEFAULT 0,
    "non_compliance_close_score" DECIMAL(5,2),
    "safety_observation_raised_target" INTEGER NOT NULL DEFAULT 0,
    "safety_observation_raised_actual" INTEGER NOT NULL DEFAULT 0,
    "safety_observation_raised_score" DECIMAL(5,2),
    "safety_observation_close_target" INTEGER NOT NULL DEFAULT 0,
    "safety_observation_close_actual" INTEGER NOT NULL DEFAULT 0,
    "safety_observation_close_score" DECIMAL(5,2),
    "work_permit_issued_target" INTEGER NOT NULL DEFAULT 0,
    "work_permit_issued_actual" INTEGER NOT NULL DEFAULT 0,
    "work_permit_issued_score" DECIMAL(5,2),
    "safe_work_method_statement_target" INTEGER NOT NULL DEFAULT 0,
    "safe_work_method_statement_actual" INTEGER NOT NULL DEFAULT 0,
    "safe_work_method_statement_score" DECIMAL(5,2),
    "emergency_mock_drills_target" INTEGER NOT NULL DEFAULT 0,
    "emergency_mock_drills_actual" INTEGER NOT NULL DEFAULT 0,
    "emergency_mock_drills_score" DECIMAL(5,2),
    "internal_audit_target" INTEGER NOT NULL DEFAULT 0,
    "internal_audit_actual" INTEGER NOT NULL DEFAULT 0,
    "internal_audit_score" DECIMAL(5,2),
    "near_miss_report_target" INTEGER NOT NULL DEFAULT 0,
    "near_miss_report_actual" INTEGER NOT NULL DEFAULT 0,
    "near_miss_report_score" DECIMAL(5,2),
    "first_aid_injury_target" INTEGER NOT NULL DEFAULT 0,
    "first_aid_injury_actual" INTEGER NOT NULL DEFAULT 0,
    "first_aid_injury_score" DECIMAL(5,2),
    "medical_treatment_injury_target" INTEGER NOT NULL DEFAULT 0,
    "medical_treatment_injury_actual" INTEGER NOT NULL DEFAULT 0,
    "medical_treatment_injury_score" DECIMAL(5,2),
    "lost_time_injury_target" INTEGER NOT NULL DEFAULT 0,
    "lost_time_injury_actual" INTEGER NOT NULL DEFAULT 0,
    "lost_time_injury_score" DECIMAL(5,2),
    "total_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "max_score" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "rating" "Rating",
    "operational_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "training_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "inspection_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "compliance_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "observation_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "documentation_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "preparedness_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "audit_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "incident_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "default_man_days_target" INTEGER NOT NULL DEFAULT 1000,
    "default_safe_work_hours_target" INTEGER NOT NULL DEFAULT 8000,
    "default_safety_induction_target" INTEGER NOT NULL DEFAULT 50,
    "default_tool_box_talk_target" INTEGER NOT NULL DEFAULT 20,
    "default_job_specific_training_target" INTEGER NOT NULL DEFAULT 30,
    "default_formal_safety_inspection_target" INTEGER NOT NULL DEFAULT 10,
    "default_non_compliance_raised_target" INTEGER NOT NULL DEFAULT 0,
    "default_non_compliance_close_target" INTEGER NOT NULL DEFAULT 100,
    "default_safety_observation_raised_target" INTEGER NOT NULL DEFAULT 50,
    "default_safety_observation_close_target" INTEGER NOT NULL DEFAULT 100,
    "default_work_permit_issued_target" INTEGER NOT NULL DEFAULT 100,
    "default_safe_work_method_statement_target" INTEGER NOT NULL DEFAULT 50,
    "default_emergency_mock_drills_target" INTEGER NOT NULL DEFAULT 2,
    "default_internal_audit_target" INTEGER NOT NULL DEFAULT 1,
    "default_near_miss_report_target" INTEGER NOT NULL DEFAULT 0,
    "default_first_aid_injury_target" INTEGER NOT NULL DEFAULT 0,
    "default_medical_treatment_injury_target" INTEGER NOT NULL DEFAULT 0,
    "default_lost_time_injury_target" INTEGER NOT NULL DEFAULT 0,
    "weight_man_days" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_safe_work_hours" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_safety_induction" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_tool_box_talk" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_job_specific_training" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_formal_safety_inspection" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_non_compliance_raised" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_non_compliance_close" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_safety_observation_raised" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_safety_observation_close" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_work_permit_issued" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_safe_work_method_statement" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_emergency_mock_drills" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_internal_audit" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_near_miss_report" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "weight_first_aid_injury" DECIMAL(5,2) NOT NULL DEFAULT 10.0,
    "weight_medical_treatment_injury" DECIMAL(5,2) NOT NULL DEFAULT 10.0,
    "weight_lost_time_injury" DECIMAL(5,2) NOT NULL DEFAULT 15.0,
    "rating_low_max" DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    "rating_medium_max" DECIMAL(5,2) NOT NULL DEFAULT 80.0,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "site_id" TEXT,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_company_code_key" ON "company"("company_code");

-- CreateIndex
CREATE UNIQUE INDEX "sites_company_id_site_code_key" ON "sites"("company_id", "site_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_site_access_user_id_site_id_key" ON "user_site_access"("user_id", "site_id");

-- CreateIndex
CREATE UNIQUE INDEX "safety_metrics_site_id_month_year_key" ON "safety_metrics"("site_id", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "company_settings_company_id_key" ON "company_settings"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_site_access" ADD CONSTRAINT "user_site_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_site_access" ADD CONSTRAINT "user_site_access_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_metrics" ADD CONSTRAINT "safety_metrics_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_metrics" ADD CONSTRAINT "safety_metrics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
