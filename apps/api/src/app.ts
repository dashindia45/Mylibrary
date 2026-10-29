import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import seatRoutes from './routes/seats.routes.js';
import bookingRoutes from './routes/bookings.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import feeRoutes from './routes/fees.routes.js';
import complaintRoutes from './routes/complaints.routes.js';
import announcementRoutes from './routes/announcements.routes.js';
import notificationRoutes from './routes/notifications.routes.js';

// Admin route imports
import adminDashboardRoutes from './routes/admin/dashboard.routes.js';
import adminSeatsRoutes from './routes/admin/seats.admin.routes.js';
import adminBookingsRoutes from './routes/admin/bookings.admin.routes.js';
import adminMembersRoutes from './routes/admin/members.admin.routes.js';
import adminFeesRoutes from './routes/admin/fees.admin.routes.js';
import adminComplaintsRoutes from './routes/admin/complaints.admin.routes.js';
import adminAnnouncementsRoutes from './routes/admin/announcements.admin.routes.js';
import adminSettingsRoutes from './routes/admin/settings.admin.routes.js';

const app = express();

// ─── Security headers ───
app.use(helmet());

// ─── CORS ───
app.use(
  cors({
    origin: true, // Allow all origins for demo & tunnel access
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body parsing ───
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Health check ───
app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// ─── Member API Routes ───
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authRoutes);
app.use('/api/v1', seatRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/fees', feeRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// ─── Admin API Routes ───
app.use('/api/v1/admin', adminDashboardRoutes);
app.use('/api/v1/admin', adminSeatsRoutes);
app.use('/api/v1/admin', adminBookingsRoutes);
app.use('/api/v1/admin', adminMembersRoutes);
app.use('/api/v1/admin', adminFeesRoutes);
app.use('/api/v1/admin', adminComplaintsRoutes);
app.use('/api/v1/admin', adminAnnouncementsRoutes);
app.use('/api/v1/admin', adminSettingsRoutes);

// ─── 404 handler ───
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// ─── Error handler ───
app.use(errorHandler);

export default app;
