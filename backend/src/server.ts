import http from 'http';
import app from './app';
import { connectRedis, redisClient, redisSubClient } from './config/redis';
import { startNotificationWorker, notificationWorker } from './workers/notificationWorker';
import { initSocketServer } from './sockets/socketService';
import { notificationQueue } from './queues/notificationQueue';
import { prisma } from './config/db';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('Booting NotifyX Backend Server...');

    // 1. Connect to Redis instances (Publisher + Subscriber)
    await connectRedis();

    // 2. Start BullMQ background worker unless explicitly disabled
    if (process.env.DISABLE_WORKER !== 'true') {
      startNotificationWorker();
    } else {
      console.log('BullMQ worker execution disabled via environment configuration (DISABLE_WORKER=true).');
    }

    // 3. Initialize HTTP server around Express
    const server = http.createServer(app);

    // 4. Mount WebSocket Socket.io server
    const io = initSocketServer(server);

    // 5. Start listening
    server.listen(PORT, () => {
      console.log('--------------------------------------------------');
      console.log(`NotifyX Server running on port ${PORT}`);
      console.log(`Database Provider: PostgreSQL`);
      console.log(`Redis connection status: CONNECTED`);
      console.log('--------------------------------------------------');
    });

    // 6. Graceful Shutdown Setup
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown sequence...`);

      // Fail-safe: Force terminate after 10s if shutdown hangs
      const forceQuitTimeout = setTimeout(() => {
        console.error('[Shutdown] Graceful shutdown timed out. Forcing process exit.');
        process.exit(1);
      }, 10000);

      try {
        // Stop accepting new WS messages & connections
        if (io) {
          console.log('[Shutdown] Closing Socket.io server...');
          await new Promise<void>((resolve, reject) => {
            io.close((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          console.log('[Shutdown] Socket.io server stopped.');
        }

        // Close Express HTTP server
        console.log('[Shutdown] Closing HTTP server...');
        await new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('[Shutdown] HTTP server stopped.');

        // Close BullMQ worker to stop pulling new jobs
        if (notificationWorker) {
          console.log('[Shutdown] Stopping BullMQ notification worker...');
          await notificationWorker.close();
          console.log('[Shutdown] BullMQ worker stopped.');
        }

        // Close BullMQ queue client
        console.log('[Shutdown] Closing BullMQ notification queue...');
        await notificationQueue.close();
        console.log('[Shutdown] BullMQ queue stopped.');

        // Disconnect Redis publisher + subscriber
        console.log('[Shutdown] Disconnecting Redis client connections...');
        if (redisClient.isOpen) {
          await redisClient.quit();
        }
        if (redisSubClient.isOpen) {
          await redisSubClient.quit();
        }
        console.log('[Shutdown] Redis disconnections finished.');

        // Disconnect Prisma Client database connection pool
        console.log('[Shutdown] Closing PostgreSQL database connection pool...');
        await prisma.$disconnect();
        console.log('[Shutdown] PostgreSQL connection closed.');

        clearTimeout(forceQuitTimeout);
        console.log('[Shutdown] Safe shutdown completed successfully.');
        process.exit(0);
      } catch (error) {
        console.error('[Shutdown] Critical error during shutdown sequence:', error);
        clearTimeout(forceQuitTimeout);
        process.exit(1);
      }
    };

    // Register listeners for terminal kill signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Fatal crash during boot sequence:', error);
    process.exit(1);
  }
};

startServer();
