import bcrypt from 'bcrypt';

/**
 * Script to generate bcrypt password hashes for creating users
 * Usage: ts-node scripts/generate-password.ts <password>
 */

const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Please provide a password');
  console.log('Usage: ts-node scripts/generate-password.ts <password>');
  console.log('Example: ts-node scripts/generate-password.ts admin123');
  process.exit(1);
}

async function generateHash() {
  try {
    const hash = await bcrypt.hash(password, 10);
    console.log('\n✅ Password hash generated successfully!\n');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\n📋 Use this hash in your SQL INSERT statement or .env file\n');
  } catch (error) {
    console.error('❌ Error generating hash:', error);
    process.exit(1);
  }
}

generateHash();
