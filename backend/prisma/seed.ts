import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Company
  const company = await prisma.company.create({
    data: {
      companyName: 'ABC Manufacturing Corp',
      companyCode: 'ABC',
      industry: 'Manufacturing',
      contactEmail: 'info@abc.com',
      contactPhone: '+1-555-0100',
      address: '123 Industrial Ave, Manufacturing District',
    },
  });
  console.log('✅ Created company:', company.companyName);

  // Create Sites
  const site1 = await prisma.site.create({
    data: {
      companyId: company.id,
      siteName: 'Manufacturing Plant 1',
      siteCode: 'MFG-01',
      siteType: 'Manufacturing',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      managerName: 'Rajesh Kumar',
      managerEmail: 'rajesh.kumar@abc.com',
      managerPhone: '+91-98765-43210',
    },
  });
  console.log('✅ Created site:', site1.siteName);

  const site2 = await prisma.site.create({
    data: {
      companyId: company.id,
      siteName: 'Manufacturing Plant 2',
      siteCode: 'MFG-02',
      siteType: 'Manufacturing',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      managerName: 'Priya Sharma',
      managerEmail: 'priya.sharma@abc.com',
      managerPhone: '+91-98765-43211',
    },
  });
  console.log('✅ Created site:', site2.siteName);

  const site3 = await prisma.site.create({
    data: {
      companyId: company.id,
      siteName: 'Corporate Headquarters',
      siteCode: 'CORP-HQ',
      siteType: 'Corporate Office',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      managerName: 'Amit Patel',
      managerEmail: 'amit.patel@abc.com',
      managerPhone: '+91-98765-43212',
    },
  });
  console.log('✅ Created site:', site3.siteName);

  // Create Users
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'admin@abc.com',
      passwordHash: adminPassword,
      fullName: 'Admin User',
      role: 'SUPER_ADMIN',
      accessLevel: 'ALL_SITES',
    },
  });
  console.log('✅ Created admin user:', admin.email, '(Password: Admin@123)');

  const managerPassword = await bcrypt.hash('Manager@123', 10);
  const manager = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'manager@abc.com',
      passwordHash: managerPassword,
      fullName: 'Site Manager',
      role: 'MANAGER',
      accessLevel: 'SPECIFIC_SITES',
    },
  });
  console.log('✅ Created manager user:', manager.email, '(Password: Manager@123)');

  // Assign sites to manager
  await prisma.userSiteAccess.createMany({
    data: [
      { userId: manager.id, siteId: site1.id },
      { userId: manager.id, siteId: site2.id },
    ],
  });
  console.log('✅ Assigned sites to manager');

  const viewerPassword = await bcrypt.hash('Viewer@123', 10);
  const viewer = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'viewer@abc.com',
      passwordHash: viewerPassword,
      fullName: 'Safety Officer',
      role: 'VIEWER',
      accessLevel: 'ALL_SITES',
    },
  });
  console.log('✅ Created viewer user:', viewer.email, '(Password: Viewer@123)');

  // Create Company Settings
  const settings = await prisma.companySettings.create({
    data: {
      companyId: company.id,
      // Default targets are already set in schema
      // Weights are already set in schema
    },
  });
  console.log('✅ Created company settings');

  // Create Sample Safety Metrics for Site 1
  const metrics1 = await prisma.safetyMetrics.create({
    data: {
      siteId: site1.id,
      month: 'January',
      year: 2025,

      // Operational
      manDaysTarget: 1000,
      manDaysActual: 950,
      manDaysScore: 9.5,
      safeWorkHoursTarget: 8000,
      safeWorkHoursActual: 7600,
      safeWorkHoursScore: 9.5,

      // Training
      safetyInductionTarget: 50,
      safetyInductionActual: 48,
      safetyInductionScore: 9.6,
      toolBoxTalkTarget: 20,
      toolBoxTalkActual: 22,
      toolBoxTalkScore: 10,
      jobSpecificTrainingTarget: 30,
      jobSpecificTrainingActual: 28,
      jobSpecificTrainingScore: 9.3,

      // Inspection & Compliance
      formalSafetyInspectionTarget: 10,
      formalSafetyInspectionActual: 10,
      formalSafetyInspectionScore: 10,
      nonComplianceRaisedTarget: 0,
      nonComplianceRaisedActual: 5,
      nonComplianceRaisedScore: 7.5,
      nonComplianceCloseTarget: 100,
      nonComplianceCloseActual: 100,
      nonComplianceCloseScore: 10,
      safetyObservationRaisedTarget: 50,
      safetyObservationRaisedActual: 52,
      safetyObservationRaisedScore: 10,
      safetyObservationCloseTarget: 100,
      safetyObservationCloseActual: 98,
      safetyObservationCloseScore: 9.8,

      // Documentation
      workPermitIssuedTarget: 100,
      workPermitIssuedActual: 98,
      workPermitIssuedScore: 9.8,
      safeWorkMethodStatementTarget: 50,
      safeWorkMethodStatementActual: 50,
      safeWorkMethodStatementScore: 10,

      // Preparedness & Audit
      emergencyMockDrillsTarget: 2,
      emergencyMockDrillsActual: 2,
      emergencyMockDrillsScore: 10,
      internalAuditTarget: 1,
      internalAuditActual: 1,
      internalAuditScore: 10,

      // Incidents
      nearMissReportTarget: 0,
      nearMissReportActual: 3,
      nearMissReportScore: 8.5,
      firstAidInjuryTarget: 0,
      firstAidInjuryActual: 2,
      firstAidInjuryScore: 8,
      medicalTreatmentInjuryTarget: 0,
      medicalTreatmentInjuryActual: 0,
      medicalTreatmentInjuryScore: 10,
      lostTimeInjuryTarget: 0,
      lostTimeInjuryActual: 0,
      lostTimeInjuryScore: 15,

      // Calculated fields
      totalScore: 175.5,
      percentage: 87.75,
      rating: 'HIGH',

      operationalScore: 19,
      trainingScore: 28.9,
      inspectionScore: 10,
      complianceScore: 27.3,
      observationScore: 19.8,
      documentationScore: 19.8,
      preparednessScore: 10,
      auditScore: 10,
      incidentScore: 51.5,

      createdBy: admin.id,
    },
  });
  console.log('✅ Created sample safety metrics for January 2025');

  // Create metrics for February 2025
  const metrics2 = await prisma.safetyMetrics.create({
    data: {
      siteId: site1.id,
      month: 'February',
      year: 2025,

      manDaysTarget: 1000,
      manDaysActual: 980,
      manDaysScore: 9.8,
      safeWorkHoursTarget: 8000,
      safeWorkHoursActual: 7840,
      safeWorkHoursScore: 9.8,

      safetyInductionTarget: 50,
      safetyInductionActual: 50,
      safetyInductionScore: 10,
      toolBoxTalkTarget: 20,
      toolBoxTalkActual: 20,
      toolBoxTalkScore: 10,
      jobSpecificTrainingTarget: 30,
      jobSpecificTrainingActual: 30,
      jobSpecificTrainingScore: 10,

      formalSafetyInspectionTarget: 10,
      formalSafetyInspectionActual: 12,
      formalSafetyInspectionScore: 10,
      nonComplianceRaisedTarget: 0,
      nonComplianceRaisedActual: 3,
      nonComplianceRaisedScore: 8.5,
      nonComplianceCloseTarget: 100,
      nonComplianceCloseActual: 100,
      nonComplianceCloseScore: 10,
      safetyObservationRaisedTarget: 50,
      safetyObservationRaisedActual: 55,
      safetyObservationRaisedScore: 10,
      safetyObservationCloseTarget: 100,
      safetyObservationCloseActual: 100,
      safetyObservationCloseScore: 10,

      workPermitIssuedTarget: 100,
      workPermitIssuedActual: 100,
      workPermitIssuedScore: 10,
      safeWorkMethodStatementTarget: 50,
      safeWorkMethodStatementActual: 52,
      safeWorkMethodStatementScore: 10,

      emergencyMockDrillsTarget: 2,
      emergencyMockDrillsActual: 2,
      emergencyMockDrillsScore: 10,
      internalAuditTarget: 1,
      internalAuditActual: 1,
      internalAuditScore: 10,

      nearMissReportTarget: 0,
      nearMissReportActual: 2,
      nearMissReportScore: 9,
      firstAidInjuryTarget: 0,
      firstAidInjuryActual: 1,
      firstAidInjuryScore: 9,
      medicalTreatmentInjuryTarget: 0,
      medicalTreatmentInjuryActual: 0,
      medicalTreatmentInjuryScore: 10,
      lostTimeInjuryTarget: 0,
      lostTimeInjuryActual: 0,
      lostTimeInjuryScore: 15,

      totalScore: 182.1,
      percentage: 91.05,
      rating: 'HIGH',

      operationalScore: 19.6,
      trainingScore: 30,
      inspectionScore: 10,
      complianceScore: 28.5,
      observationScore: 20,
      documentationScore: 20,
      preparednessScore: 10,
      auditScore: 10,
      incidentScore: 53,

      createdBy: admin.id,
    },
  });
  console.log('✅ Created sample safety metrics for February 2025');

  console.log('\n✨ Database seeding completed successfully!\n');
  console.log('📝 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:   admin@abc.com    / Admin@123');
  console.log('Manager: manager@abc.com  / Manager@123');
  console.log('Viewer:  viewer@abc.com   / Viewer@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
