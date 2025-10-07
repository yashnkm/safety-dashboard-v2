import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ==================== COMPANIES ====================
// Only SUPER_ADMIN can manage companies

router.get(
  '/companies',
  authorize('SUPER_ADMIN'),
  asyncHandler(adminController.getAllCompanies.bind(adminController))
);

router.post(
  '/companies',
  authorize('SUPER_ADMIN'),
  asyncHandler(adminController.createCompany.bind(adminController))
);

router.put(
  '/companies/:id',
  authorize('SUPER_ADMIN'),
  asyncHandler(adminController.updateCompany.bind(adminController))
);

router.delete(
  '/companies/:id',
  authorize('SUPER_ADMIN'),
  asyncHandler(adminController.deleteCompany.bind(adminController))
);

// ==================== SITES ====================
// SUPER_ADMIN and ADMIN can manage sites

router.get(
  '/sites',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(adminController.getSites.bind(adminController))
);

router.post(
  '/sites',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(adminController.createSite.bind(adminController))
);

router.put(
  '/sites/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(adminController.updateSite.bind(adminController))
);

router.delete(
  '/sites/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(adminController.deleteSite.bind(adminController))
);

// ==================== USERS ====================
// SUPER_ADMIN and ADMIN can manage users

router.get(
  '/users',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(adminController.getUsers.bind(adminController))
);

router.post(
  '/users',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(adminController.createUser.bind(adminController))
);

router.put(
  '/users/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(adminController.updateUser.bind(adminController))
);

router.delete(
  '/users/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(adminController.deleteUser.bind(adminController))
);

router.post(
  '/users/:id/sites',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(adminController.assignSitesToUser.bind(adminController))
);

router.get(
  '/users/:id/sites',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(adminController.getUserSites.bind(adminController))
);

export default router;
