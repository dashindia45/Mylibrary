import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || process.env.API_PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:5174',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(','),

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me-in-prod',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  otp: {
    expiry: parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10),
    rateLimitWindow: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_SECONDS || '60', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
    resendCooldown: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '30', 10),
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || 'console',
    apiKey: process.env.EMAIL_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@mylibrary.in',
  },

  sms: {
    provider: process.env.SMS_PROVIDER || 'console',
    apiKey: process.env.SMS_API_KEY || '',
    senderId: process.env.SMS_SENDER_ID || 'MYLIB',
    templateId: process.env.SMS_TEMPLATE_ID || '',
  },

  library: {
    timezone: process.env.LIBRARY_TIMEZONE || 'Asia/Kolkata',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10),
  },
} as const;

export type Config = typeof config;
