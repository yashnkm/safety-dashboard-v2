import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Email and password are required',
        });
      }

      const result = await authService.login(email, password);

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, fullName, companyId, role } = req.body;

      if (!email || !password || !fullName || !companyId || !role) {
        return res.status(400).json({
          status: 'error',
          message: 'All fields are required',
        });
      }

      const result = await authService.register({
        email,
        password,
        fullName,
        companyId,
        role,
      });

      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
        });
      }

      const user = await authService.getCurrentUser(req.user.id);

      res.json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logging out revokes every token this user currently holds, rather than
   * only clearing the browser's copy — otherwise "log out" on a shared or
   * compromised machine achieves nothing server-side for up to 7 days.
   *
   * Note this signs the user out everywhere, not just on this device. For a
   * dashboard where each person uses one machine that is the safer default.
   *
   * The route is authenticated, but a caller whose token is already invalid is
   * effectively logged out anyway, so a 401 here is a harmless outcome.
   */
  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.user) {
        await authService.revokeTokens(req.user.id);
      }
      res.json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is required',
        });
      }

      const result = await authService.requestPasswordReset(email);

      res.json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          status: 'error',
          message: 'Token and newPassword are required',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          status: 'error',
          message: 'Password must be at least 8 characters',
        });
      }

      const result = await authService.resetPassword(token, newPassword);

      res.json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
