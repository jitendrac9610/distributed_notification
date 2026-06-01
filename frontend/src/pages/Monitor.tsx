import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { apiClient } from '../api/client';
import type { MonitorStats } from '../types';
import {
  Activity,
  Database,
  RefreshCw,
  HardDrive,
  Users,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Monitor() {
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(true);

  const fetchStats = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await apiClient.get('/monitor');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch monitor stats:', err);
      toast.error('Failed to retrieve system status metrics');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    let intervalId: any;
    if (pollingActive) {
      intervalId = setInterval(() => {
        fetchStats(true);
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollingActive]);

  const getStatusBadge = (status: 'ONLINE' | 'OFFLINE') => {
    if (status === 'ONLINE') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          ONLINE
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        OFFLINE
      </span>
    );
  };

  return (
    <div className="flex bg-dark-950 min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-wide">SYSTEM ARCHITECTURE MONITOR</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live inspection of NotifyX nodes, database pools, Redis Pub/Sub, and background BullMQ workers.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setPollingActive(!pollingActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 ${
                pollingActive
                  ? 'bg-brand-500/10 border-brand-500/35 text-brand-400'
                  : 'bg-dark-900 border-slate-800 text-slate-400'
              }`}
            >
              {pollingActive ? '● Live Polling Active (3s)' : '○ Polling Paused'}
            </button>

            <button
              onClick={() => fetchStats(false)}
              className="p-2.5 rounded-lg bg-dark-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Force Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading && !stats ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs font-bold mt-4 uppercase">Loading Metrics...</p>
          </div>
        ) : stats ? (
          <div className="space-y-8">
            {/* Service Grid Status */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                Service Instances Health Check
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* PostgreSQL Card */}
                <div className="glass-panel p-6 rounded-xl border border-slate-800/80 flex flex-col justify-between h-40">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-sky-500/10 rounded-lg text-sky-400">
                      <Database className="w-5 h-5" />
                    </div>
                    {getStatusBadge(stats.services.database)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">PostgreSQL DB</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Source of truth. Persists credentials, notifications, and logs.
                    </p>
                  </div>
                </div>

                {/* Redis Caching/PubSub Card */}
                <div className="glass-panel p-6 rounded-xl border border-slate-800/80 flex flex-col justify-between h-40">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-red-500/10 rounded-lg text-red-400">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    {getStatusBadge(stats.services.redis)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Redis Broker</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Powers Pub/Sub channels and BullMQ background task stores.
                    </p>
                  </div>
                </div>

                {/* WebSocket Server Card */}
                <div className="glass-panel p-6 rounded-xl border border-slate-800/80 flex flex-col justify-between h-40">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <Users className="w-5 h-5" />
                    </div>
                    {getStatusBadge(stats.services.websocket.status)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">WebSocket Node</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Client push interface. Local active connections: {stats.metrics.onlineUsersCount}
                    </p>
                  </div>
                </div>

                {/* BullMQ Worker Card */}
                <div className="glass-panel p-6 rounded-xl border border-slate-800/80 flex flex-col justify-between h-40">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400">
                      <Activity className="w-5 h-5" />
                    </div>
                    {getStatusBadge(stats.services.queue.status)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">BullMQ Workers</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Background process executors handling retry logs and delays.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* BullMQ Metrics & Visual Queues */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* BullMQ Job Counts */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-slate-800/80">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-800 pb-3">
                  BullMQ Queue Stats (<span className="font-mono text-[10px] text-brand-400">notification-delivery-queue</span>)
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="bg-dark-900/60 p-4 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Waiting</span>
                    <h2 className="text-2xl font-black text-slate-200 mt-1">{stats.services.queue.waiting}</h2>
                  </div>

                  <div className="bg-brand-500/5 p-4 rounded-lg border border-brand-500/20 text-center">
                    <span className="text-[10px] font-bold text-brand-400 uppercase">Active</span>
                    <h2 className="text-2xl font-black text-brand-400 mt-1 animate-pulse">{stats.services.queue.active}</h2>
                  </div>

                  <div className="bg-emerald-500/5 p-4 rounded-lg border border-emerald-500/20 text-center">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Completed</span>
                    <h2 className="text-2xl font-black text-emerald-400 mt-1">{stats.services.queue.completed}</h2>
                  </div>

                  <div className="bg-rose-500/5 p-4 rounded-lg border border-rose-500/20 text-center">
                    <span className="text-[10px] font-bold text-rose-400 uppercase">Failed</span>
                    <h2 className="text-2xl font-black text-rose-400 mt-1">{stats.services.queue.failed}</h2>
                  </div>

                  <div className="bg-amber-500/5 p-4 rounded-lg border border-amber-500/20 text-center">
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Delayed</span>
                    <h2 className="text-2xl font-black text-amber-400 mt-1">{stats.services.queue.delayed}</h2>
                  </div>
                </div>

                {/* Queue Health Progress Bar */}
                <div className="mt-8">
                  <div className="flex justify-between text-xs text-slate-400 font-bold mb-2">
                    <span>Queue Delivery Success Rate</span>
                    <span className="text-emerald-400 font-mono">
                      {stats.services.queue.completed + stats.services.queue.failed > 0
                        ? Math.round(
                            (stats.services.queue.completed /
                              (stats.services.queue.completed + stats.services.queue.failed)) *
                              100
                          )
                        : 100}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500"
                      style={{
                        width: `${
                          stats.services.queue.completed + stats.services.queue.failed > 0
                            ? (stats.services.queue.completed /
                                (stats.services.queue.completed + stats.services.queue.failed)) *
                              100
                            : 100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* System Aggregates */}
              <div className="glass-panel p-6 rounded-xl border border-slate-800/80 space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-3">
                  Database Aggregates
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total Notifications in DB</span>
                    <span className="font-mono text-sm font-bold text-slate-200">
                      {stats.metrics.totalNotifications}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total Unread Messages</span>
                    <span className="font-mono text-sm font-bold text-brand-400">
                      {stats.metrics.totalUnread}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Connected WebSocket Users</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {stats.metrics.onlineUsersCount}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-dark-900/60 border border-slate-800 text-[10px] text-slate-500 space-y-1">
                  <p className="font-bold text-slate-400 uppercase mb-1">Architecture Note</p>
                  <p>• Polling monitors live Node.js cluster processes.</p>
                  <p>• Active WebSocket counts list concurrent connections across nodes synced via Redis Pub/Sub.</p>
                </div>
              </div>
            </div>

            {/* Live Background Delivery Logs (BullMQ) */}
            <div className="glass-panel p-6 rounded-xl border border-slate-800/80">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-800 pb-3">
                Live Background Delivery Logs (BullMQ)
              </h3>
              <div className="bg-dark-950/40 rounded-lg border border-slate-900 overflow-hidden font-mono text-xs">
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-900/50">
                  {stats.logs && stats.logs.length > 0 ? (
                    stats.logs.map((log) => (
                      <div key={log.id} className="p-3 hover:bg-slate-900/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start sm:items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            log.status === 'DELIVERED' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {log.status}
                          </span>
                          <div className="space-y-0.5">
                            <div className="text-slate-300">
                              <span className="text-brand-400 font-semibold">Attempt #{log.attempt}</span>: processed{' '}
                              <span className="text-white font-semibold">"{log.notification.title}"</span> for{' '}
                              <span className="text-slate-400 underline">{log.notification.recipient.email}</span>
                            </div>
                            {log.error && (
                              <div className="text-rose-400/90 text-[11px] bg-rose-950/20 px-2 py-1 rounded border border-rose-900/30 mt-1">
                                Error: {log.error}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-slate-500 text-[10px] shrink-0 self-end sm:self-center">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      No background delivery logs recorded yet. Trigger a notification to start queue processing.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-8 text-center text-rose-400 border border-rose-500/20 rounded-xl">
            <XCircle className="w-8 h-8 mx-auto mb-3" />
            <h3 className="text-sm font-bold">Failed to load system metrics</h3>
            <p className="text-xs text-slate-500 mt-1">Please ensure the backend is running and that your databases are active.</p>
          </div>
        )}
      </main>
    </div>
  );
}
