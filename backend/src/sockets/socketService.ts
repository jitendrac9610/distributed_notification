import { Server, Socket } from 'socket.io';
import http from 'http';
import { redisSubClient } from '../config/redis';
import { verifyToken, TokenPayload } from '../utils/auth';

export interface CustomSocket extends Socket {
  user?: TokenPayload;
}

let io: Server;

// Track active online users on this server instance (userId -> tab/socket count)
export const onlineUsers = new Map<string, number>();

export const initSocketServer = (httpServer: http.Server) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // For development flexibility
      methods: ['GET', 'POST'],
    },
  });

  // 1. JWT Authentication Middleware for WebSockets
  io.use((socket: CustomSocket, next) => {
    let token = socket.handshake.auth?.token;

    // Fallback: Check standard Auth Headers
    if (!token) {
      const authHeader = socket.handshake.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Authentication error: Invalid token'));
    }

    socket.user = decoded;
    next();
  });

  // 2. Client Connection Handler
  io.on('connection', (socket: CustomSocket) => {
    const userId = socket.user?.userId;
    if (!userId) return;

    // Join room: user:{userId}
    const roomName = `user:${userId}`;
    socket.join(roomName);

    // Track active presence counts
    const activeTabs = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, activeTabs + 1);
    console.log(`[WS] User ${userId} connected (tab: ${activeTabs + 1})`);

    // Handle offline triggers
    socket.on('disconnect', () => {
      const remainingTabs = onlineUsers.get(userId) || 0;
      if (remainingTabs <= 1) {
        onlineUsers.delete(userId);
        console.log(`[WS] User ${userId} went offline`);
      } else {
        onlineUsers.set(userId, remainingTabs - 1);
        console.log(`[WS] User ${userId} closed a tab (remaining: ${remainingTabs - 1})`);
      }
    });
  });

  // 3. Setup Redis Pub/Sub listener
  setupRedisSubscriber();

  return io;
};

// 4. Listen to cross-instance notifications on Redis
const setupRedisSubscriber = async () => {
  try {
    await redisSubClient.subscribe('notifications', (message) => {
      try {
        const payload = JSON.parse(message);
        const { event, recipientId, notification } = payload;

        if (event === 'notification:new' && recipientId && notification) {
          console.log(`[PubSub] Broadcasting to room user:${recipientId}`);
          
          // Emit to local sockets registered in user's room
          io.to(`user:${recipientId}`).emit('notification:new', notification);
        }
      } catch (err) {
        console.error('[PubSub] Error parsing message:', err);
      }
    });
    console.log('[PubSub] Subscribed to Redis channel "notifications"');
  } catch (error) {
    console.error('[PubSub] Setup failed:', error);
  }
};

// Fetch live counts for monitoring
export const getSocketStats = () => {
  return {
    onlineUsersCount: onlineUsers.size,
    onlineUserIds: Array.from(onlineUsers.keys()),
  };
};
