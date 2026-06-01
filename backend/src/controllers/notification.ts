import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../config/db';
import { createNotificationSchema } from '../validators/notification';
import { addNotificationToQueue } from '../queues/notificationQueue';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

// POST /api/notifications (Admin Only)
export const createNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const validationResult = createNotificationSchema.safeParse(req.body);
  if (!validationResult.success) {
    return ApiResponse.error(res, validationResult.error.errors[0].message, null, 400);
  }

  const { recipientId, recipientEmail, type, priority, title, message, metadata } = validationResult.data;

  let targetUserId = recipientId;

  if (recipientEmail) {
    const user = await prisma.user.findUnique({ where: { email: recipientEmail } });
    if (!user) {
      return ApiResponse.error(res, `User with email ${recipientEmail} not found`, null, 404);
    }
    targetUserId = user.id;
  }

  if (!targetUserId) {
    return ApiResponse.error(res, 'Failed to resolve recipient', null, 400);
  }

  // Check if recipient exists
  const userExists = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!userExists) {
    return ApiResponse.error(res, 'Recipient user not found', null, 404);
  }

  // 1. Store in DB as PENDING
  const notification = await prisma.notification.create({
    data: {
      recipientId: targetUserId,
      type,
      priority,
      title,
      message,
      metadata: metadata || undefined,
      status: 'PENDING',
    },
  });

  // 2. Push to BullMQ queue
  await addNotificationToQueue(notification.id);

  return ApiResponse.success(
    res,
    'Notification queued successfully',
    { notification },
    201
  );
});

// GET /api/notifications (Paginated and Filtered)
export const getNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Unauthorized', null, 401);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (req.user.role === 'ADMIN') {
    // Admin can see all notifications
  } else {
    // Standard user sees their own successfully processed/delivered notifications
    whereClause.recipientId = req.user.userId;
    whereClause.status = 'DELIVERED';
  }

  // Filter by Notification Type
  if (req.query.type) {
    whereClause.type = req.query.type as any;
  }

  // Filter by Notification Priority
  if (req.query.priority) {
    whereClause.priority = req.query.priority as any;
  }

  // Filter by Read/Unread Status (status: READ / UNREAD)
  if (req.query.status) {
    const statusStr = (req.query.status as string).toUpperCase();
    if (statusStr === 'READ') {
      whereClause.read = true;
    } else if (statusStr === 'UNREAD') {
      whereClause.read = false;
    }
  }

  // Fetch count and results concurrently
  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where: whereClause }),
    prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include:
        req.user.role === 'ADMIN'
          ? {
              recipient: {
                select: { id: true, email: true },
              },
            }
          : undefined,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return ApiResponse.success(res, 'Notifications fetched successfully', {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  });
});

// GET /api/notifications/unread
export const getUnreadNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Unauthorized', null, 401);
  }

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: req.user.userId,
      read: false,
      status: 'DELIVERED',
    },
    orderBy: { createdAt: 'desc' },
  });

  return ApiResponse.success(res, 'Unread notifications fetched successfully', {
    notifications,
  });
});

// PATCH /api/notifications/:id/read
export const markRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Unauthorized', null, 401);
  }
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    return ApiResponse.error(res, 'Notification not found', null, 404);
  }

  // Verify ownership (only the recipient can mark as read)
  if (notification.recipientId !== req.user.userId) {
    return ApiResponse.error(res, 'Forbidden: You do not own this notification', null, 403);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  return ApiResponse.success(res, 'Notification marked as read', { notification: updated });
});

// PATCH /api/notifications/read-all
export const markAllRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Unauthorized', null, 401);
  }

  const result = await prisma.notification.updateMany({
    where: {
      recipientId: req.user.userId,
      read: false,
      status: 'DELIVERED',
    },
    data: { read: true },
  });

  return ApiResponse.success(res, 'All notifications marked as read', {
    count: result.count,
  });
});

// DELETE /api/notifications/:id
export const deleteNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Unauthorized', null, 401);
  }
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    return ApiResponse.error(res, 'Notification not found', null, 404);
  }

  // Verify ownership (unless admin)
  if (notification.recipientId !== req.user.userId && req.user.role !== 'ADMIN') {
    return ApiResponse.error(res, 'Forbidden: You cannot delete this notification', null, 403);
  }

  await prisma.notification.delete({
    where: { id },
  });

  return ApiResponse.success(res, 'Notification deleted successfully');
});
