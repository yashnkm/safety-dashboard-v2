import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('\n🔐 Create Super Admin User\n');

    // Get company details
    const companyName = await question('Company Name: ');
    const companyCode = await question('Company Code (e.g., COMP001): ');

    // Get user details
    const email = await question('Admin Email: ');
    const password = await question('Admin Password: ');
    const fullName = await question('Admin Full Name: ');

    console.log('\n⏳ Creating company and admin user...\n');

    // Create company
    const company = await prisma.company.create({
      data: {
        companyName,
        companyCode,
        isActive: true,
      },
    });

    console.log('✅ Company created:', company.companyName);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: 'SUPER_ADMIN',
        companyId: company.id,
        accessLevel: 'ALL_SITES',
        isActive: true,
      },
    });

    console.log('✅ Super Admin created:', user.email);
    console.log('\n🎉 Setup complete! You can now login with:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\n⚠️  Remember to change your password after first login!\n');

    rl.close();
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAdmin();
