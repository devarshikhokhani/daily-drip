import React, { useState } from 'react';
import { Coffee, Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Signup({ onNavigate }) {
  const { register } = useAuth();
  const { addToast } = useSocket();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password, role);
      addToast({ title: 'Welcome to Daily Drip!', message: 'Account created successfully', type: 'success' });
      onNavigate('home');
    } catch (err) {
      setError(err.message || 'Registration failed');
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
          <h1 className="text-2xl font-bold text-[#24160f]">Create an Account</h1>
          <p className="text-xs text-stone-500">
            Join the smart café ecosystem and unlock your Coffee Passport.
          </p>
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
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aria Chen"
                className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#24160f] placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

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
                placeholder="aria@example.com"
                className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#24160f] placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-stone-500 block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#24160f] placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-stone-500 block mb-1">
              Account Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-4 py-2.5 text-xs text-[#24160f] focus:outline-none focus:border-amber-500 font-mono"
            >
              <option value="customer">Customer (Standard)</option>
              <option value="staff">Barista / Staff</option>
              <option value="admin">Café Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-stone-500">
          <span>Already registered? </span>
          <button
            onClick={() => onNavigate('login')}
            className="text-amber-600 font-bold hover:underline"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
