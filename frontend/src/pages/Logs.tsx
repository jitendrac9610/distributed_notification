import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { apiClient } from '../api/client';
import {
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { DeliveryLog } from '../types';

export default function Logs() {
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = async (p = page, status = statusFilter) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/monitor/logs?page=${p}&limit=15&status=${status}`);
      const { logs: fetchedLogs, pagination } = response.data.data;
      setLogs(fetchedLogs);
      setPage(pagination.page);
      setTotalPages(pagination.totalPages);
      setTotalLogs(pagination.total);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page, statusFilter);
  }, [page, statusFilter]);

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400';
      case 'NORMAL':
        return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
      case 'HIGH':
        return 'border-amber-500/50 bg-amber-500/10 text-amber-400';
      case 'CRITICAL':
        return 'border-rose-500/50 bg-rose-500/10 text-rose-400';
      default:
        return 'border-slate-800 bg-slate-900 text-slate-400';
    }
  };

  return (
    <div className="flex bg-dark-950 min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-wide">DELIVERY AUDIT LOGS</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Trace background job ingestion pipeline lifecycle, delivery states, retries, and failed backoffs.
            </p>
          </div>
          <button
            onClick={() => fetchLogs(page, statusFilter)}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters Panel */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800/80 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Filter className="w-4 h-4 text-brand-400" />
            <span>Filter Delivery Logs</span>
          </div>

          <div className="flex gap-2">
            {['ALL', 'DELIVERED', 'FAILED'].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  statusFilter === status
                    ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-600/20'
                    : 'bg-dark-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="glass-panel rounded-xl border border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-dark-900/60 uppercase tracking-widest text-[10px] text-slate-400 font-bold">
                  <th className="py-4 px-5">Timestamp</th>
                  <th className="py-4 px-5">Recipient</th>
                  <th className="py-4 px-5">Notification Details</th>
                  <th className="py-4 px-5">Attempt</th>
                  <th className="py-4 px-5">Channels</th>
                  <th className="py-4 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-bold uppercase tracking-wider">
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-brand-400" /> Fetching traces...
                      </span>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No delivery logs matched the criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const delivery = (log.notification && (log.notification as any).metadata && typeof (log.notification as any).metadata === 'object')
                      ? (log.notification as any).metadata._delivery
                      : null;
                    const channels = delivery?.channels || ['IN_APP'];
                    
                    return (
                      <tr key={log.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-4 px-5 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-4 px-5 font-semibold text-slate-300">
                          {log.notification?.recipient?.email || 'Unknown User'}
                        </td>
                        <td className="py-4 px-5 max-w-sm">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-900 border border-slate-800 text-slate-300">
                              {log.notification?.type || 'SYSTEM'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${getPriorityColor((log.notification as any)?.priority)}`}>
                              {(log.notification as any)?.priority || 'NORMAL'}
                            </span>
                          </div>
                          <p className="font-bold text-white text-xs truncate max-w-xs">{log.notification?.title}</p>
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-400">
                          <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-semibold text-brand-400">
                            #{log.attempt}
                          </span>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold">
                            {channels.includes('IN_APP') && (
                              <span className="px-1.5 py-0.5 bg-dark-900 border border-slate-800 rounded text-slate-300" title="Delivered via In-App WebSocket">
                                🔔 Push
                              </span>
                            )}
                            {channels.includes('EMAIL') && (
                              <span className="px-1.5 py-0.5 bg-indigo-950/40 border border-indigo-500/20 rounded text-indigo-300" title="Sent via SMTP Mock">
                                📧 Email
                              </span>
                            )}
                            {channels.includes('SMS') && (
                              <span className="px-1.5 py-0.5 bg-teal-950/40 border border-teal-500/20 rounded text-teal-300" title="Sent via SMS Mock">
                                📱 SMS
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-[10px] font-extrabold border uppercase tracking-wider ${
                            log.status === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {log.status}
                          </span>
                          {log.error && (
                            <div className="text-[10px] font-mono text-rose-400/90 bg-rose-950/20 border border-rose-900/30 px-2 py-1 rounded mt-1.5 max-w-xs break-words">
                              Error: {log.error}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-5 py-4 border-t border-slate-800 bg-dark-900/30">
              <span className="text-slate-500 text-xs">
                Showing page <strong className="text-slate-300">{page}</strong> of <strong className="text-slate-300">{totalPages}</strong> ({totalLogs} traces)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
