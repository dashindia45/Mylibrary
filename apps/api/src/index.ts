import app from './app.js';
import { config } from './config/index.js';
import prisma from './config/database.js';

async function main() {
  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }

  // Start server
  const server = app.listen(config.port, () => {
    console.log(`🚀 API server running on http://localhost:${config.port}`);
    console.log(`📋 Health check: http://localhost:${config.port}/api/v1/health`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
