import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import Sidebar from '../components/Sidebar';
import { apiClient } from '../api/client';
import { Send, Terminal, AlertTriangle, CheckCircle, Info, RefreshCw, Mail, Fingerprint } from 'lucide-react';
import toast from 'react-hot-toast';
import type { MonitorStats } from '../types';

export default function Admin() {
  const [recipientType, setRecipientType] = useState<'EMAIL' | 'ID'>('EMAIL');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [type, setType] = useState('SYSTEM');
  const [priority, setPriority] = useState('NORMAL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [metadataStr, setMetadataStr] = useState('{\n  "source": "admin_panel"\n}');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Queue and Job Monitor state
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setStatsLoading(true);
    try {
      const response = await apiClient.get('/monitor');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch monitor stats:', err);
    } finally {
      if (!silent) setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (recipientType === 'EMAIL' && !recipientEmail) {
      toast.error('Recipient email is required');
      return;
    }
    if (recipientType === 'ID' && !recipientId) {
      toast.error('Recipient User ID is required');
      return;
    }
    if (!title || !message) {
      toast.error('Title and message are required');
      return;
    }

    // Validate and parse Metadata JSON
    let metadata = null;
    if (metadataStr.trim()) {
      try {
        metadata = JSON.parse(metadataStr.trim());
      } catch (err) {
        setErrorMsg('Invalid JSON format in Metadata field. Please check your syntax.');
        toast.error('Invalid JSON format');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        type,
        priority,
        title,
        message,
        metadata,
      };

      if (recipientType === 'EMAIL') {
        payload.recipientEmail = recipientEmail.trim();
      } else {
        payload.recipientId = recipientId.trim();
      }

      const response = await apiClient.post('/notifications', payload);
      setSuccessMsg(`Notification successfully created and queued! ID: ${response.data.data.notification.id}`);
      fetchStats(true);
      
      // Reset form fields except recipient configuration
      setTitle('');
      setMessage('');
      setMetadataStr('{\n  "source": "admin_panel"\n}');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to publish notification');
      toast.error('Failed to publish notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-dark-950 min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-wide">ADMIN TRIGGER PANEL</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Publish notifications to specific users. Jobs are placed in the BullMQ queue for delivery.
          </p>
        </div>

        {/* Info Alert on Queue Architecture */}
        <div className="mb-6 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs flex gap-3 items-start">
          <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-brand-400" />
          <div className="space-y-1">
            <p className="font-bold text-white uppercase tracking-wider">Distributed Queue Integration</p>
            <p className="text-slate-300 leading-relaxed">
              Submitting this form stores the notification in PostgreSQL as <span className="font-mono text-white bg-slate-900 px-1 py-0.5 rounded">PENDING</span> and registers a job inside BullMQ. A worker processes the job, transitions the status to <span className="font-mono text-white bg-slate-900 px-1 py-0.5 rounded">DELIVERED</span>, logs history, and broadcasts across nodes via Redis Pub/Sub.
            </p>
          </div>
        </div>

        {/* Live Queue Job Counts */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Waiting (Pending)', count: stats.services.queue.waiting, color: 'text-amber-400' },
              { label: 'Active (Processing)', count: stats.services.queue.active, color: 'text-brand-400' },
              { label: 'Completed', count: stats.services.queue.completed, color: 'text-emerald-400' },
              { label: 'Failed', count: stats.services.queue.failed, color: 'text-rose-400' },
              { label: 'Delayed (Retry backoff)', count: stats.services.queue.delayed, color: 'text-indigo-400' },
            ].map((q) => (
              <div key={q.label} className="glass-panel p-3 rounded-lg border border-slate-800/60 flex flex-col justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{q.label}</span>
                <span className={`text-lg font-black mt-0.5 ${q.color}`}>{q.count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-slate-800/80">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-6 text-slate-200 border-b border-slate-800 pb-3">
              Trigger New Notification
            </h2>

            {successMsg && (
              <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-3">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Recipient Lookup Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Recipient Identity
                </label>
                <div className="flex gap-5 pb-1">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-colors">
                    <input
                      type="radio"
                      name="recipientType"
                      checked={recipientType === 'EMAIL'}
                      onChange={() => setRecipientType('EMAIL')}
                      className="accent-brand-500"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>User Email</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-colors">
                    <input
                      type="radio"
                      name="recipientType"
                      checked={recipientType === 'ID'}
                      onChange={() => setRecipientType('ID')}
                      className="accent-brand-500"
                    />
                    <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                    <span>User UUID</span>
                  </label>
                </div>

                {recipientType === 'EMAIL' ? (
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="Enter recipient email (e.g. user@notifyx.com)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-dark-900/60 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                      required
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <Fingerprint className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      placeholder="Enter recipient User UUID"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-dark-900/60 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Type and Priority Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="LIKE">LIKE</option>
                    <option value="COMMENT">COMMENT</option>
                    <option value="FOLLOW">FOLLOW</option>
                    <option value="MESSAGE">MESSAGE</option>
                    <option value="SYSTEM">SYSTEM</option>
                    <option value="ALERT">ALERT</option>
                    <option value="DEPLOYMENT">DEPLOYMENT</option>
                    <option value="PAYMENT">PAYMENT</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification Heading (e.g. Deployment Successful)"
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-900/60 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              {/* Message Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Body</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Detail content for the notification alert..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-900/60 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-600/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Queuing Job...' : 'Send Notification'}</span>
              </button>
            </form>
          </div>

          {/* Side Panel: Metadata Editor */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2 mb-4 text-slate-200 border-b border-slate-800 pb-3">
                <Terminal className="w-4.5 h-4.5 text-brand-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Metadata JSON Editor</h3>
              </div>
              <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                Provide custom properties to attach to the notification. Useful for payload transfer.
              </p>
              <textarea
                value={metadataStr}
                onChange={(e) => setMetadataStr(e.target.value)}
                rows={8}
                className="w-full p-3 font-mono text-[11px] text-emerald-400 bg-dark-950 border border-slate-800 rounded-lg focus:outline-none focus:border-brand-500 leading-relaxed"
                placeholder="{}"
              />
              <div className="mt-3 flex justify-between items-center">
                <span className="text-[9px] text-slate-500 font-bold uppercase">JSON Validated</span>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(metadataStr);
                      setMetadataStr(JSON.stringify(parsed, null, 2));
                      toast.success('JSON Formatted successfully!');
                    } catch (e) {
                      toast.error('Invalid JSON syntax');
                    }
                  }}
                  className="text-[9px] text-brand-400 hover:text-brand-300 font-bold uppercase"
                >
                  Auto-Format
                </button>
              </div>
            </div>

            {/* Test Helper Card */}
            <div className="glass-panel p-6 rounded-xl border border-slate-800/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase">Testing Failed Jobs</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                To test the **BullMQ exponential backoff and retry system**, type a title beginning with "<span className="text-rose-400 font-bold font-mono">fail</span>", or add <span className="font-mono text-emerald-400">"simulateFailure": true</span> into the metadata JSON. 
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                The queue will record failure logs and retry the job with exponential backoff up to 3 times before setting the status to <span className="text-rose-500 font-bold">FAILED</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Live Background Job Logs (BullMQ) with User Read Status */}
        {stats && (
          <div className="mt-8 glass-panel p-6 rounded-xl border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4.5 h-4.5 text-brand-400" />
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Live Background Job Logs (BullMQ)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {statsLoading && (
                  <span className="text-[10px] text-slate-500 uppercase font-bold animate-pulse">Syncing...</span>
                )}
                <span className="text-[9px] text-slate-500 font-mono">
                  Last Sync: {new Date(stats.timestamp).toLocaleTimeString()}
                </span>
                <button
                  onClick={() => fetchStats(false)}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Force Refresh"
                >
                  <RefreshCw className={`w-3 h-3 ${statsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="bg-dark-950/40 rounded-lg border border-slate-900 overflow-hidden font-mono text-xs">
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-900/50">
                {stats.logs && stats.logs.length > 0 ? (
                  stats.logs.map((log) => (
                    <div key={log.id} className="p-3 hover:bg-slate-900/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start sm:items-center gap-3">
                        {/* Delivery Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          log.status === 'DELIVERED' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {log.status}
                        </span>

                        {/* Read Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          log.notification.read 
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {log.notification.read ? 'READ BY USER' : 'UNREAD'}
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
                    No background job delivery logs recorded yet. Trigger a notification to start queue processing.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
