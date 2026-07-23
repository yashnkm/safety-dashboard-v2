import { Router } from 'express';
import { capaController } from '../controllers/capa.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// All CAPA routes require authentication
router.use(authenticate);

// Any authenticated role can view corrective actions
router.get('/', asyncHandler(capaController.getCorrectiveActions.bind(capaController)));
router.get('/:id', asyncHandler(capaController.getCorrectiveAction.bind(capaController)));

// Creating/updating a corrective action (including closing it) requires at
// least MANAGER - VIEWER is read-only
router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'),
  asyncHandler(capaController.createCorrectiveAction.bind(capaController))
);

router.put(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'),
  asyncHandler(capaController.updateCorrectiveAction.bind(capaController))
);

// Deleting is more destructive - confined to admins
router.delete(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(capaController.deleteCorrectiveAction.bind(capaController))
);

export default router;
