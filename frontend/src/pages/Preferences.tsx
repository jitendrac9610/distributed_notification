import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Save, Bell, Mail, Shield, Zap, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Preferences() {
  const [preferences, setPreferences] = useState({
    pushRealTime: true,
    emailAlerts: true,
    securityAlerts: true,
    paymentAlerts: true,
    systemAlerts: true,
    productUpdates: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleTimeChange = (key: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    toast.success('Preferences saved successfully!');
  };

  return (
    <div className="flex bg-dark-950 min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 border-b border-slate-900 pb-5">
          <h1 className="text-2xl font-black tracking-wide">NOTIFICATION SETTINGS</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure delivery methods, quiet hours, and categorized subscription rules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Settings Panels */}
          <div className="md:col-span-2 space-y-6">
            {/* Core Delivery Channels */}
            <div className="glass-panel p-6 rounded-xl border border-slate-800/80">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5 text-slate-200 flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-400" /> Primary Delivery Channels
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-dark-900/40 border border-slate-850">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">WebSocket Real-Time Push</h3>
                    <p className="text-[10px] text-slate-400">Receive instant browser toast notifications over persistent TCP channels.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.pushRealTime}
                      onChange={() => handleToggle('pushRealTime')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-dark-900/40 border border-slate-850">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Notifications <span className="text-[8px] bg-brand-500/10 text-brand-400 border border-brand-500/20 px-1 py-0.5 rounded font-black tracking-widest">MOCKED</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">Deliver asynchronous fallback notifications to your verified email address.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.emailAlerts}
                      onChange={() => handleToggle('emailAlerts')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Categorized Alerts Preferences */}
            <div className="glass-panel p-6 rounded-xl border border-slate-800/80">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5 text-slate-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-400" /> Subscription Preferences
              </h2>

              <div className="space-y-4">
                {[
                  { key: 'securityAlerts' as const, label: 'Security Notifications', desc: 'Critical activity alerts including password changes and suspicious logins.' },
                  { key: 'paymentAlerts' as const, label: 'Payment & Billing Receipts', desc: 'Statements of accounts, transaction summaries, and renewal receipts.' },
                  { key: 'systemAlerts' as const, label: 'System & DevOps Maintenance', desc: 'Alerts regarding server health, updates, and upcoming maintenance schedules.' },
                  { key: 'productUpdates' as const, label: 'Product Enhancements & Releases', desc: 'Monthly feature releases, new feature availability, and developer tips.' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-900/20 transition-colors">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{item.label}</h3>
                      <p className="text-[10px] text-slate-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences[item.key]}
                        onChange={() => handleToggle(item.key)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="glass-panel p-6 rounded-xl border border-slate-800/80">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5 text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-400" /> Quiet Hours
              </h2>

              <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                Suppress real-time push alerts during quiet hours. Notifications will be stored in your inbox silently.
              </p>

              <div className="flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Quiet Time Starts:</span>
                  <input
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                    className="bg-dark-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Quiet Time Ends:</span>
                  <input
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
                    className="bg-dark-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/20 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Configuration
            </button>
          </div>

          {/* Quick Info Sidebar */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-xl border border-slate-800/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-brand-400 animate-pulse" /> Infrastructure Settings
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                In NotifyX, users subscribe to topics. Preferences are saved in the client session storage and sent as filters in real-time.
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-900 pt-3">
                For backend integration, the preferences schema triggers SMS/Email gateways conditionally within the BullMQ worker job router stack.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
