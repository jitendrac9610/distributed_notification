import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../config/db';
import { redisClient } from '../config/redis';
import { notificationQueue } from '../queues/notificationQueue';
import { notificationWorker } from '../workers/notificationWorker';
import { getSocketStats } from '../sockets/socketService';
import { ApiResponse } from '../utils/apiResponse';

// GET /api/monitor
export const getMonitorStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Check database connectivity
    let dbStatus: 'ONLINE' | 'OFFLINE' = 'OFFLINE';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'ONLINE';
    } catch (e) {
      console.error('Database health check failed:', e);
    }

    // 2. Check Redis connectivity
    const redisStatus = redisClient.isOpen ? 'ONLINE' : 'OFFLINE';

    // 3. Check BullMQ status & job counts
    let queueStats = {
      status: 'OFFLINE',
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };

    try {
      const counts = await notificationQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed'
      );
      queueStats = {
        status: 'ONLINE',
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed,
      };
    } catch (e) {
      console.error('Queue health check failed:', e);
    }

    // 4. Retrieve Socket.io status & presence stats
    let socketStats = {
      status: 'OFFLINE',
      onlineUsersCount: 0,
      onlineUserIds: [] as string[],
    };

    try {
      const stats = getSocketStats();
      socketStats = {
        status: 'ONLINE',
        onlineUsersCount: stats.onlineUsersCount,
        onlineUserIds: stats.onlineUserIds,
      };
    } catch (e) {
      console.error('Socket stats retrieval failed:', e);
    }

    // 5. Query basic notification DB aggregates and latest delivery logs
    const [totalNotifications, totalUnread, logs] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { read: false, status: 'DELIVERED' } }),
      prisma.deliveryLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 15,
        include: {
          notification: {
            select: {
              title: true,
              type: true,
              read: true,
              recipient: {
                select: { email: true },
              },
            },
          },
        },
      }),
    ]);

    return ApiResponse.success(res, 'Monitor stats retrieved successfully', {
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
        queue: queueStats,
        websocket: socketStats,
      },
      metrics: {
        totalNotifications,
        totalUnread,
        onlineUsersCount: socketStats.onlineUsersCount,
      },
      logs,
    });
  } catch (error: any) {
    console.error('Monitor status fetch error:', error);
    return ApiResponse.error(res, 'Internal Server Error', error.message, 500);
  }
};

// GET /api/health
export const getHealth = async (req: Request, res: Response) => {
  try {
    let dbStatus = 'DOWN';
    let redisStatus = 'DOWN';
    let queueStatus = 'DOWN';
    let workerStatus = 'DOWN';

    // 1. Check DB connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'UP';
    } catch (e) {
      console.error('[Health] DB disconnected:', e);
    }

    // 2. Check Redis connection
    try {
      if (redisClient.isOpen) {
        redisStatus = 'UP';
      }
    } catch (e) {
      console.error('[Health] Redis disconnected:', e);
    }

    // 3. Check BullMQ Queue connection
    try {
      const client = await notificationQueue.client;
      if (client && client.status === 'ready') {
        queueStatus = 'UP';
      }
    } catch (e) {
      console.error('[Health] BullMQ Queue client error:', e);
    }

    // 4. Check BullMQ Worker status
    try {
      if (notificationWorker && notificationWorker.isRunning()) {
        workerStatus = 'UP';
      }
    } catch (e) {
      console.error('[Health] BullMQ Worker error:', e);
    }

    const overallHealthy =
      dbStatus === 'UP' &&
      redisStatus === 'UP' &&
      queueStatus === 'UP' &&
      workerStatus === 'UP';

    const statusCode = overallHealthy ? 200 : 503;

    return ApiResponse.success(
      res,
      overallHealthy ? 'System is healthy' : 'System is degraded',
      {
        status: overallHealthy ? 'HEALTHY' : 'DEGRADED',
        timestamp: new Date().toISOString(),
        services: {
          backend: 'UP',
          database: dbStatus,
          redis: redisStatus,
          queue: queueStatus,
          worker: workerStatus,
        },
      },
      statusCode
    );
  } catch (error: any) {
    console.error('[Health] Check error:', error);
    return ApiResponse.error(res, 'Failed to perform health check', error.message, 500);
  }
};

// GET /api/monitor/metrics
export const getMonitorMetrics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Get job counts from BullMQ Queue
    const counts = await notificationQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed'
    );

    // 2. Get DB counts
    const [totalNotifications, totalUnread, totalUsers, totalLogs] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { read: false, status: 'DELIVERED' } }),
      prisma.user.count(),
      prisma.deliveryLog.count(),
    ]);

    // 3. Get websocket stats
    const socketStats = getSocketStats();

    // 4. Gather Node process statistics
    const processMetrics = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };

    return ApiResponse.success(res, 'System metrics retrieved successfully', {
      timestamp: new Date().toISOString(),
      jobs: {
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed,
      },
      database: {
        totalNotifications,
        totalUnread,
        totalUsers,
        totalLogs,
      },
      websocket: {
        onlineUsersCount: socketStats.onlineUsersCount,
      },
      process: processMetrics,
    });
  } catch (error: any) {
    console.error('Metrics fetch error:', error);
    return ApiResponse.error(res, 'Failed to fetch metrics', error.message, 500);
  }
};

// GET /api/monitor/logs
export const getDeliveryLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const status = req.query.status as string; // ALL, DELIVERED, FAILED
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.deliveryLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          notification: {
            select: {
              title: true,
              type: true,
              read: true,
              priority: true,
              recipient: {
                select: { email: true },
              },
            },
          },
        },
      }),
      prisma.deliveryLog.count({ where: whereClause }),
    ]);

    return ApiResponse.success(res, 'Delivery logs retrieved successfully', {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Delivery logs fetch error:', error);
    return ApiResponse.error(res, 'Failed to fetch delivery logs', error.message, 500);
  }
};
