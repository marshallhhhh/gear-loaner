import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import gearRoutes from './routes/gear.js';
import loanRoutes from './routes/loans.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import foundReportRoutes from './routes/foundReports.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Security
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || (isProd ? false : 'http://localhost:5173'),
    credentials: true,
  }),
);

// Trust proxy for correct req.ip behind reverse proxies (production only)
if (isProd) {
  app.set('trust proxy', 1);
}

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/gear', gearRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/found-reports', foundReportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server running');
});

export default app;
