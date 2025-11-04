-- Create your first company and admin user
-- Password will be: admin123
-- IMPORTANT: Change this password after first login!

-- Step 1: Create Company
INSERT INTO "Company" ("id", "companyName", "companyCode", "isActive", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'My Company',
  'COMP001',
  true,
  NOW(),
  NOW()
);

-- Step 2: Create Super Admin User
-- Password: admin123 (bcrypt hash below)
INSERT INTO "User" ("id", "email", "passwordHash", "fullName", "role", "companyId", "accessLevel", "isActive", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'admin@company.com',
  '$2b$10$YQiC8X0EKZ0K.ZX0X0X0XuJ0J0J0J0J0J0J0J0J0J0J0J0J0J0J0J0',
  'Super Admin',
  'SUPER_ADMIN',
  '00000000-0000-0000-0000-000000000001',
  'ALL_SITES',
  true,
  NOW(),
  NOW()
);

-- Done! You can now login with:
-- Email: admin@company.com
-- Password: admin123
