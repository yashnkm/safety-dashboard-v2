import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// The global limiter (1000 per 15 min) is sized for a chatty dashboard and is
// far too generous for credential endpoints: it leaves room to spray one guess
// across hundreds of accounts without ever tripping the 5-attempt per-account
// lockout, and to keep a known email permanently locked out.
//
// skipSuccessfulRequests means a legitimate user who signs in normally never
// consumes budget — only failures count.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many sign-in attempts. Please try again in 15 minutes.' },
});

// Password reset is unauthenticated and sends mail + writes a token row, so it
// is throttled harder: without this it doubles as a mail bomb and an unbounded
// way to grow passwordResetToken.
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many password reset requests. Please try again later.' },
});

router.post('/login', loginLimiter, authController.login);
// SECURITY: /register was public and accepted a caller-supplied `role`, letting
// anyone with a companyId self-register as SUPER_ADMIN and receive a token. It
// was unused by the frontend (users are created via the authenticated Admin
// Panel), so the route is removed rather than gated. Do not re-add without
// authenticate + authorize('SUPER_ADMIN') + server-side role validation.
router.post('/logout', authController.logout);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);
router.get('/me', authenticate, authController.getMe);

export default router;
