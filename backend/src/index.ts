import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { cleanupOrphanedLogos } from './services/logoCleanup.service';

const app = express();

// Trust the first hop proxy (Cloudflare Tunnel) so req.ip and the
// X-Forwarded-For header are handled correctly — without this,
// express-rate-limit throws on every request behind the tunnel.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (e.g. company logos). Explicitly relax helmet's
// default same-origin Cross-Origin-Resource-Policy for this path only —
// otherwise the frontend (kpi.protecther.in) can't <img src> anything
// served from here (api.protecther.in).
app.use(
  '/uploads',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, '../uploads'))
);

// Rate limiting - very lenient for development and testing
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10000 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Routes
app.use('/api', routes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler (must be after error handler in Express 5)
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Safety Dashboard API server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
});

// Periodic safety net for orphaned logo uploads: an upload happens
// immediately on file-select in the admin form, before the company record
// is actually saved, so a cancelled/abandoned edit leaves a file with
// nothing pointing at it. Company create/update/delete already trigger an
// immediate sweep; this just catches whatever those miss.
setInterval(cleanupOrphanedLogos, 60 * 60 * 1000); // hourly

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});
