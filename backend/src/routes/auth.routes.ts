import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

router.post('/login', authController.login);
// SECURITY: /register was public and accepted a caller-supplied `role`, letting
// anyone with a companyId self-register as SUPER_ADMIN and receive a token. It
// was unused by the frontend (users are created via the authenticated Admin
// Panel), so the route is removed rather than gated. Do not re-add without
// authenticate + authorize('SUPER_ADMIN') + server-side role validation.
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authenticate, authController.getMe);

export default router;
