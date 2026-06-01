export type Role = 'USER' | 'ADMIN';

export type NotificationType =
  | 'LIKE'
  | 'COMMENT'
  | 'FOLLOW'
  | 'MESSAGE'
  | 'SYSTEM'
  | 'ALERT'
  | 'DEPLOYMENT'
  | 'PAYMENT';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type NotificationStatus = 'PENDING' | 'DELIVERED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  metadata?: any;
  read: boolean;
  status: NotificationStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  recipient?: {
    id: string;
    email: string;
  };
}

export interface QueueServiceStats {
  status: 'ONLINE' | 'OFFLINE';
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface WebSocketServiceStats {
  status: 'ONLINE' | 'OFFLINE';
  onlineUsersCount: number;
  onlineUserIds: string[];
}

export interface DeliveryLog {
  id: string;
  notificationId: string;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  error: string | null;
  attempt: number;
  timestamp: string;
  notification: {
    title: string;
    type: string;
    read: boolean;
    recipient: {
      email: string;
    };
  };
}

export interface MonitorStats {
  timestamp: string;
  services: {
    database: 'ONLINE' | 'OFFLINE';
    redis: 'ONLINE' | 'OFFLINE';
    queue: QueueServiceStats;
    websocket: WebSocketServiceStats;
  };
  metrics: {
    totalNotifications: number;
    totalUnread: number;
    onlineUsersCount: number;
  };
  logs: DeliveryLog[];
}
