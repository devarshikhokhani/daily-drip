import React, { useState } from 'react';
import { Coffee, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Login({ onNavigate }) {
  const { login, demoLogin } = useAuth();
  const { addToast } = useSocket();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      addToast({ title: 'Welcome Back!', message: 'Signed in successfully', type: 'success' });
      onNavigate('home');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role) => {
    setError('');
    setLoading(true);
    try {
      await demoLogin(role);
      addToast({
        title: `Signed in as ${role.toUpperCase()}`,
        message: 'Demo session active',
        type: 'success'
      });
      if (role === 'admin') onNavigate('admin');
      else if (role === 'staff') onNavigate('staff');
      else onNavigate('home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 mx-auto flex items-center justify-center text-white shadow-lg">
            <Coffee className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#24160f]">Sign In to Daily Drip</h1>
          <p className="text-xs text-stone-500">
            Access your Coffee Passport, DNA profiles, and smart queue.
          </p>
        </div>

        {/* 1-Click Demo Accounts Selector */}
        <div className="bg-[#fdf8f3] p-3.5 rounded-2xl border border-[#e8dfd5] space-y-2">
          <span className="text-[10px] font-mono uppercase text-amber-700 font-bold block text-center">
            🚀 1-Click Demo Account Login
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('customer')}
              className="py-2 px-1 rounded-xl bg-white hover:bg-amber-50 text-[#24160f] text-[11px] font-semibold transition border border-[#e8dfd5] text-center shadow-sm"
            >
              👤 Customer
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('staff')}
              className="py-2 px-1 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 text-[11px] font-semibold transition border border-[#e8dfd5] text-center shadow-sm"
            >
              ☕ Barista
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              className="py-2 px-1 rounded-xl bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-semibold transition border border-[#e8dfd5] text-center shadow-sm"
            >
              👑 Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono uppercase text-stone-500 block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@dailydrip.cafe"
                className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#24160f] placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-mono uppercase text-stone-500 block">
                Password
              </label>
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-[11px] text-amber-600 hover:underline"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#24160f] placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-stone-500">
          <span>Don't have an account? </span>
          <button
            onClick={() => onNavigate('signup')}
            className="text-amber-600 font-bold hover:underline"
          >
            Create one
          </button>
        </div>
      </div>
    </div>
  );
}
