import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import {
  Bell,
  LayoutDashboard,
  Shield,
  Activity,
  LogOut,
  Wifi,
  WifiOff,
  FileText,
  Settings,
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { unreadCount, isConnected } = useNotificationStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      badge: unreadCount > 0 ? unreadCount : null,
    },
    {
      name: 'Preferences',
      path: '/preferences',
      icon: Settings,
      badge: null,
    },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push(
      {
        name: 'Admin Panel',
        path: '/admin',
        icon: Shield,
        badge: null,
      },
      {
        name: 'System Monitor',
        path: '/monitor',
        icon: Activity,
        badge: null,
      },
      {
        name: 'Delivery Logs',
        path: '/logs',
        icon: FileText,
        badge: null,
      }
    );
  }

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 flex flex-col h-screen shrink-0">
      {/* Header / Brand */}
      <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-400 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <Bell className="w-5 h-5 animate-pulse-slow" />
          </div>
          <span className="font-extrabold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-brand-300">
            NOTIFYX
          </span>
        </Link>

        {/* Real-time Indicator */}
        <div className="flex items-center" title={isConnected ? 'Live WebSocket Connected' : 'Disconnected'}>
          {isConnected ? (
            <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
          ) : (
            <WifiOff className="w-4 h-4 text-rose-500 animate-pulse" />
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/15'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge !== null && (
                <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                  isActive ? 'bg-white text-brand-700' : 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Footer */}
      <div className="p-4 border-t border-slate-800/50 space-y-4">
        <div className="px-4 py-3 rounded-lg bg-dark-900/40 border border-slate-800/50">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Logged in as</p>
          <p className="text-sm font-semibold text-slate-200 truncate mt-0.5" title={user?.email}>
            {user?.email}
          </p>
          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 border uppercase ${
            user?.role === 'ADMIN' 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
          }`}>
            {user?.role}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-400 hover:bg-rose-950/20 hover:text-rose-400 border border-transparent hover:border-rose-500/25 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
