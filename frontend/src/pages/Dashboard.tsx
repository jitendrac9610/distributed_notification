import { useEffect, useState, useRef } from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import Sidebar from '../components/Sidebar';
import {
  Bell,
  CheckCheck,
  Trash2,
  Calendar,
  Layers,
  Clock,
  Eye,
  X,
  Shield,
  Activity,
  Wifi,
  WifiOff,
  Heart,
  MessageSquare,
  UserPlus,
  Info,
  CheckCircle2,
  ExternalLink,
  Archive,
  Terminal,
} from 'lucide-react';
import type { Notification, NotificationPriority } from '../types';
import toast from 'react-hot-toast';

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function Dashboard() {
  const { user, token } = useAuthStore();
  const {
    notifications,
    fetchNotifications,
    markRead,
    markAllRead,
    deleteNotification,
    initSocket,
    isConnected,
  } = useNotificationStore();

  // Filters and Selection States
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([
    { id: '1', text: 'Inbox initialized', time: new Date().toLocaleTimeString(), type: 'info' },
  ]);

  // Track previous connection state to trigger reconnect notifications
  const wasConnected = useRef(isConnected);

  // Fetch feed and open web socket connection
  useEffect(() => {
    fetchNotifications();
    if (token) {
      initSocket(token);
    }
  }, [token, initSocket, fetchNotifications]);

  // Log WebSocket state transitions and sync offline events
  useEffect(() => {
    if (isConnected !== wasConnected.current) {
      if (isConnected) {
        setActivities((prev) => [
          {
            id: Math.random().toString(),
            text: '🟢 WebSocket connection established',
            time: new Date().toLocaleTimeString(),
            type: 'success',
          },
          ...prev,
        ]);
        if (wasConnected.current === false) {
          fetchNotifications();
          toast.success('System reconnected. Notifications synced successfully!');
          setActivities((prev) => [
            {
              id: Math.random().toString(),
              text: '🔄 Synced database notification inbox',
              time: new Date().toLocaleTimeString(),
              type: 'info',
            },
            ...prev,
          ]);
        }
      } else {
        setActivities((prev) => [
          {
            id: Math.random().toString(),
            text: '🔴 WebSocket server disconnected',
            time: new Date().toLocaleTimeString(),
            type: 'error',
          },
          ...prev,
        ]);
      }
      wasConnected.current = isConnected;
    }
  }, [isConnected, fetchNotifications]);

  // Add activity logs when receiving new notifications
  const prevNotificationsCount = useRef(notifications.length);
  useEffect(() => {
    if (notifications.length > prevNotificationsCount.current) {
      const newItemsCount = notifications.length - prevNotificationsCount.current;
      setActivities((prev) => [
        {
          id: Math.random().toString(),
          text: `📩 Received ${newItemsCount} new notification(s)`,
          time: new Date().toLocaleTimeString(),
          type: 'info',
        },
        ...prev,
      ]);
    }
    prevNotificationsCount.current = notifications.length;
  }, [notifications]);

  // Action Handlers with Live Activity logs
  const handleMarkRead = async (id: string) => {
    const item = notifications.find((n) => n.id === id);
    await markRead(id);
    setActivities((prev) => [
      {
        id: Math.random().toString(),
        text: `✅ Marked "${item?.title || 'alert'}" as read`,
        time: new Date().toLocaleTimeString(),
        type: 'success',
      },
      ...prev,
    ]);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setActivities((prev) => [
      {
        id: Math.random().toString(),
        text: '✅ Marked all notifications as read',
        time: new Date().toLocaleTimeString(),
        type: 'success',
      },
      ...prev,
    ]);
  };

  const handleDeleteNotification = async (id: string) => {
    const item = notifications.find((n) => n.id === id);
    await deleteNotification(id);
    setActivities((prev) => [
      {
        id: Math.random().toString(),
        text: `🗑️ Deleted "${item?.title || 'alert'}"`,
        time: new Date().toLocaleTimeString(),
        type: 'warning',
      },
      ...prev,
    ]);
  };

  const handleDummyAction = (actionName: string, title: string) => {
    toast.success(`Action "${actionName}" performed on "${title}"`);
    setActivities((prev) => [
      {
        id: Math.random().toString(),
        text: `⚡ Executed "${actionName}" action`,
        time: new Date().toLocaleTimeString(),
        type: 'success',
      },
      ...prev,
    ]);
  };

  // Tab Filtering Logic
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'UNREAD') return !n.read;
    if (activeTab === 'CRITICAL') return n.priority === 'CRITICAL' || n.priority === 'HIGH';
    if (activeTab === 'SYSTEM') return n.type === 'SYSTEM' || n.type === 'DEPLOYMENT';
    if (activeTab === 'SECURITY') return n.type === 'ALERT';
    if (activeTab === 'PAYMENT') return n.type === 'PAYMENT';
    return true;
  });

  // Priority-based Sorting (CRITICAL -> HIGH -> NORMAL -> LOW)
  const priorityWeights: Record<NotificationPriority, number> = {
    CRITICAL: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1,
  };

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const weightA = priorityWeights[a.priority] || 2;
    const weightB = priorityWeights[b.priority] || 2;
    if (weightA !== weightB) {
      return weightB - weightA; // Higher priority on top
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Latest first
  });

  // Icon Mapping per type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LIKE':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'COMMENT':
        return <MessageSquare className="w-4 h-4 text-sky-400" />;
      case 'FOLLOW':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'MESSAGE':
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case 'SYSTEM':
        return <Info className="w-4 h-4 text-amber-400" />;
      case 'ALERT':
        return <Shield className="w-4 h-4 text-red-400 animate-pulse" />;
      case 'DEPLOYMENT':
        return <CheckCircle2 className="w-4 h-4 text-teal-400" />;
      case 'PAYMENT':
        return <CheckCircle2 className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'LOW':
        return 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400';
      case 'NORMAL':
        return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
      case 'HIGH':
        return 'border-amber-500/50 bg-amber-500/10 text-amber-400';
      case 'CRITICAL':
        return 'border-rose-500/50 bg-rose-500/10 text-rose-400 font-extrabold';
      default:
        return 'border-slate-700 bg-slate-800 text-slate-400';
    }
  };

  const getLeftBorder = (priority: NotificationPriority) => {
    switch (priority) {
      case 'LOW':
        return 'border-l-indigo-500';
      case 'NORMAL':
        return 'border-l-emerald-500';
      case 'HIGH':
        return 'border-l-amber-500';
      case 'CRITICAL':
        return 'border-l-rose-500';
      default:
        return 'border-l-slate-700';
    }
  };

  // Helper stats calculation
  const unreadAlerts = notifications.filter((n) => !n.read).length;
  const criticalAlerts = notifications.filter((n) => n.priority === 'CRITICAL' || n.priority === 'HIGH').length;
  
  // Calculate delivered today
  const deliveredToday = notifications.filter((n) => {
    const today = new Date().toDateString();
    return new Date(n.createdAt).toDateString() === today;
  }).length;

  return (
    <div className="flex bg-dark-950 min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-wide">NOTIFICATIONS CENTER</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Welcome back, <span className="text-slate-200 font-bold">{user?.email}</span>. Trace and manage real-time events.
            </p>
          </div>

          <button
            onClick={handleMarkAllRead}
            disabled={unreadAlerts === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-dark-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 font-bold text-xs active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span>Mark All As Read</span>
          </button>
        </div>

        {/* Analytics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Unread Messages</p>
              <h2 className="text-2xl font-black mt-0.5 text-brand-400">{unreadAlerts}</h2>
            </div>
            <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">
              <Bell className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Critical / Urgent</p>
              <h2 className="text-2xl font-black mt-0.5 text-rose-400">{criticalAlerts}</h2>
            </div>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <Shield className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Synced Today</p>
              <h2 className="text-2xl font-black mt-0.5 text-emerald-400">{deliveredToday}</h2>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Layers className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Websocket State</p>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold mt-2 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {isConnected ? <Wifi className="w-4.5 h-4.5" /> : <WifiOff className="w-4.5 h-4.5" />}
            </div>
          </div>
        </div>

        {/* Offline Alert Banner */}
        {!isConnected && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex gap-3 items-center animate-pulse">
            <WifiOff className="w-4.5 h-4.5 text-rose-400 shrink-0" />
            <span>You are currently offline. Notifications will sync dynamically once the connection is restored.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Feed Column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filter Tabs Navigation */}
            <div className="flex border-b border-slate-800 gap-1.5 overflow-x-auto pb-px">
              {[
                { id: 'ALL', label: 'All notifications' },
                { id: 'UNREAD', label: `Unread (${unreadAlerts})` },
                { id: 'CRITICAL', label: `Urgent (${criticalAlerts})` },
                { id: 'SYSTEM', label: 'System' },
                { id: 'SECURITY', label: 'Security' },
                { id: 'PAYMENT', label: 'Payments' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'border-brand-500 text-white font-black'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notifications Feed */}
            <div className="space-y-4">
              {sortedNotifications.length === 0 ? (
                <div className="glass-panel p-12 rounded-xl border border-slate-800/80 text-center flex flex-col items-center justify-center">
                  <div className="p-4 rounded-full bg-slate-900/60 border border-slate-800 text-slate-500 mb-4">
                    <Bell className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-300">No Notifications Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    No alerts in this category. Connect to the admin panel to trigger fresh notifications.
                  </p>
                </div>
              ) : (
                sortedNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`glass-card p-5 rounded-xl border-l-4 ${getLeftBorder(
                      n.priority
                    )} flex flex-col justify-between gap-4 transition-all hover:border-slate-700/80 ${
                      !n.read ? 'bg-brand-950/5' : ''
                    }`}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Type Icon + Badge */}
                        <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded font-extrabold bg-slate-900 border border-slate-800 text-slate-300 uppercase">
                          {getTypeIcon(n.type)}
                          <span>{n.type}</span>
                        </span>
                        
                        {/* Priority Badge */}
                        <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold border uppercase ${getPriorityColor(n.priority)}`}>
                          {n.priority}
                        </span>

                        {/* Status indicators */}
                        {!n.read && (
                          <span className="text-[9px] px-2 py-0.5 rounded font-extrabold bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase animate-pulse">
                            NEW
                          </span>
                        )}

                        {/* Multi-channel outputs badges */}
                        {(() => {
                          const delivery = (n.metadata && typeof n.metadata === 'object')
                            ? (n.metadata as any)._delivery
                            : null;
                          const channels = delivery?.channels || [];
                          return (
                            <>
                              {channels.includes('EMAIL') && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-indigo-950/40 text-indigo-300 border border-indigo-500/20" title="Delivered via Mock Email Provider">
                                  📧 Email
                                </span>
                              )}
                              {channels.includes('SMS') && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-teal-950/40 text-teal-300 border border-teal-500/20" title="Delivered via Mock SMS Provider">
                                  📱 SMS
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* Header Title */}
                      <h3 className={`text-sm font-black tracking-wide ${!n.read ? 'text-white' : 'text-slate-300'}`}>
                        {n.title}
                      </h3>

                      {/* Message Content */}
                      <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>

                      {/* Timestamps */}
                      <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Actionable buttons */}
                    <div className="flex flex-wrap items-center justify-between border-t border-slate-900/50 pt-3 mt-1 gap-4">
                      <div className="flex gap-2">
                        {/* Render type-specific actionable triggers */}
                        {n.type === 'DEPLOYMENT' && (
                          <>
                            <button
                              onClick={() => handleDummyAction('APPROVE DEPLOY', n.title)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDummyAction('REJECT DEPLOY', n.title)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {n.type === 'PAYMENT' && (
                          <button
                            onClick={() => handleDummyAction('VIEW INVOICE', n.title)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 rounded flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Open Invoice
                          </button>
                        )}
                        {n.type === 'ALERT' && (
                          <button
                            onClick={() => handleDummyAction('ACKNOWLEDGE ALERT', n.title)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 rounded"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>

                      {/* Control Panel Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedNotification(n);
                            if (!n.read && user && n.recipientId === user.id) {
                              handleMarkRead(n.id);
                            }
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-slate-400" /> View Details
                        </button>

                        {!n.read && user && n.recipientId === user.id && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-brand-600/10 hover:bg-brand-600 text-brand-400 hover:text-white border border-brand-500/25 rounded"
                          >
                            Mark Read
                          </button>
                        )}

                        <button
                          onClick={() => handleDummyAction('ARCHIVE', n.title)}
                          className="p-1 text-slate-500 hover:text-slate-300"
                          title="Archive notification"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteNotification(n.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Live Activity Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Live Socket Info Box */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800/80 space-y-4">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
                <Terminal className="w-4 h-4 text-brand-400" /> WebSocket Node
              </h3>

              <div className="space-y-3 font-mono text-[10px] text-slate-400">
                <div className="flex justify-between">
                  <span>Channel status:</span>
                  <span className={isConnected ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transport:</span>
                  <span>websocket</span>
                </div>
                <div className="flex justify-between">
                  <span>Heartbeat check:</span>
                  <span>25s intervals</span>
                </div>
                <div className="flex justify-between">
                  <span>Subscribers:</span>
                  <span>{user?.email}</span>
                </div>
              </div>
            </div>

            {/* Activity Stream */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800/80 space-y-4">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
                <Activity className="w-4 h-4 text-brand-400 animate-pulse" /> Live Activity
              </h3>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {activities.map((act) => (
                  <div key={act.id} className="text-[10px] leading-relaxed border-b border-slate-900/60 pb-2 space-y-0.5">
                    <div className="flex justify-between text-slate-500 font-mono">
                      <span>{act.time}</span>
                    </div>
                    <p className="text-slate-300 font-medium">{act.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Details Inspections Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl glass-panel rounded-2xl border border-slate-800/80 shadow-2xl p-6 relative flex flex-col gap-4 animate-scale-in">
            {/* Close */}
            <button
              onClick={() => setSelectedNotification(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header info badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-extrabold bg-slate-900 border border-slate-800 text-slate-300 uppercase">
                {getTypeIcon(selectedNotification.type)}
                <span>{selectedNotification.type}</span>
              </span>
              <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold border uppercase ${getPriorityColor(selectedNotification.priority)}`}>
                {selectedNotification.priority}
              </span>
              <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold border uppercase ${
                selectedNotification.read
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
              }`}>
                {selectedNotification.read ? 'READ' : 'UNREAD'}
              </span>
            </div>

            {/* Titles */}
            <div>
              <h2 className="text-lg font-black tracking-wide text-white">
                {selectedNotification.title}
              </h2>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                ID: {selectedNotification.id}
              </p>
            </div>

            {/* Message block */}
            <div className="p-4 rounded-xl bg-dark-900/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
              {selectedNotification.message}
            </div>

            {/* System audit log info */}
            <div className="border-t border-slate-850 pt-4 space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Ingestion Lifecycle</h3>
              
              <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-slate-400">
                <div className="space-y-1">
                  <div><span className="text-slate-500">Created:</span> {new Date(selectedNotification.createdAt).toLocaleString()}</div>
                  <div><span className="text-slate-500">Ingested:</span> Queue Ingestion successful</div>
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-500">Method:</span>{' '}
                    {isConnected ? (
                      <span className="text-emerald-400 font-bold">WebSocket Push</span>
                    ) : (
                      <span className="text-amber-400 font-bold">Offline Sync Rest Pull</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500">Channels:</span>{' '}
                    {(() => {
                      const delivery = (selectedNotification.metadata && typeof selectedNotification.metadata === 'object')
                        ? (selectedNotification.metadata as any)._delivery
                        : null;
                      const channels = delivery?.channels || ['IN_APP'];
                      return channels.join(', ');
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata JSON block */}
            {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Metadata JSON Details</span>
                <pre className="p-3 rounded-lg bg-dark-950 border border-slate-900 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-36">
                  {JSON.stringify(selectedNotification.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-2 flex justify-between items-center border-t border-slate-800/50 pt-4">
              <span className="text-[9px] font-mono text-slate-500">Node cluster: worker_prod_1</span>
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 rounded-lg bg-dark-900 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
