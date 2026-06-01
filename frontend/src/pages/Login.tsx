import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Bell, KeyRound, Mail, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, clearError, loading, token } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate, clearError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    const success = await login(email, password);
    if (success) {
      toast.success('Successfully logged in!');
      navigate('/dashboard');
    }
  };

  const fillCredentials = (role: 'ADMIN' | 'USER') => {
    if (role === 'ADMIN') {
      setEmail('admin@notifyx.com');
      setPassword('Password123!');
    } else {
      setEmail('user@notifyx.com');
      setPassword('Password123!');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden">
      {/* Sleek background glowing blur orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-brand-500/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-brand-500/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-800/80 shadow-2xl p-8 relative">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 mb-4 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">WELCOME BACK</h1>
          <p className="text-slate-400 text-xs mt-1">Sign in to manage your real-time notification queue</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-dark-900/60 border border-slate-800/80 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-dark-900/60 border border-slate-800/80 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-600/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs">
          <span className="text-slate-500">New to NotifyX? </span>
          <Link to="/register" className="font-semibold text-brand-400 hover:underline">
            Create an Account
          </Link>
        </div>

        {/* Demo Credentials Quick Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-800/50">
          <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest mb-3">
            Quick Fill Demo Accounts
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fillCredentials('ADMIN')}
              className="py-2 px-3 text-xs font-bold text-slate-300 bg-slate-900/60 border border-slate-800 hover:border-brand-500/40 rounded-lg transition-all duration-200"
            >
              👑 Fill Admin
            </button>
            <button
              onClick={() => fillCredentials('USER')}
              className="py-2 px-3 text-xs font-bold text-slate-300 bg-slate-900/60 border border-slate-800 hover:border-brand-500/40 rounded-lg transition-all duration-200"
            >
              👤 Fill User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
