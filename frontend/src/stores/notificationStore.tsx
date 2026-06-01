import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { apiClient } from '../api/client';
import type { Notification } from '../types';
import { useAuthStore } from './authStore';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  socket: Socket | null;
  isConnected: boolean;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  initSocket: (token: string) => void;
  disconnectSocket: () => void;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  socket: null,
  isConnected: false,

  fetchNotifications: async () => {
    try {
      const response = await apiClient.get('/notifications');
      const notifications: Notification[] = response.data.data.notifications;
      const unreadCount = notifications.filter((n) => !n.read).length;
      set({ notifications, unreadCount });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  },

  markRead: async (id) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        );
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        };
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllRead: async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      const currentUser = useAuthStore.getState().user;
      set((state) => {
        const updated = state.notifications.map((n) =>
          currentUser && n.recipientId === currentUser.id ? { ...n, read: true } : n
        );
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        };
      });
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  deleteNotification: async (id) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      set((state) => {
        const updated = state.notifications.filter((n) => n.id !== id);
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        };
      });
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },

  initSocket: (token) => {
    const { socket } = get();
    if (socket) return; // Avoid duplicate connections

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      set({ isConnected: true });
      console.log('[WS] Socket connected successfully');
    });

    newSocket.on('disconnect', () => {
      set({ isConnected: false });
      console.log('[WS] Socket disconnected');
    });

    newSocket.on('notification:new', (notification: Notification) => {
      set((state) => {
        // Prevent duplicate append if it exists
        if (state.notifications.some((n) => n.id === notification.id)) {
          return {};
        }
        const updated = [notification, ...state.notifications];
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        };
      });

      // Show real-time sleek custom toast
      toast.custom(
        (t) => {
          const priorityStyles = {
            LOW: 'border-indigo-500 bg-dark-900/95 text-slate-100',
            NORMAL: 'border-emerald-500 bg-dark-900/95 text-slate-100',
            HIGH: 'border-amber-500 bg-dark-900/95 text-slate-100',
            CRITICAL: 'border-rose-500 bg-rose-950/95 text-rose-50 border-2 animate-bounce',
          };

          const style = priorityStyles[notification.priority] || priorityStyles.NORMAL;

          return (
            <div
              className={`${
                t.visible ? 'animate-fade-in' : 'animate-fade-out'
              } max-w-sm w-full glass-panel shadow-2xl rounded-lg pointer-events-auto flex border-l-4 p-4 ${style}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-extrabold bg-dark-800 text-brand-300 border border-slate-700/60 uppercase">
                    {notification.type}
                  </span>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase opacity-85">
                    {notification.priority}
                  </span>
                </div>
                <h4 className="text-xs font-bold mt-1 text-slate-100">{notification.title}</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{notification.message}</p>
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="ml-3 text-[10px] font-bold text-brand-400 hover:text-brand-300 self-start"
              >
                DISMISS
              </button>
            </div>
          );
        },
        { duration: 6000 }
      );
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));
