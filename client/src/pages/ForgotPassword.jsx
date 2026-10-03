import React, { useState } from 'react';
import { Mail, ArrowRight, CheckCircle, KeyRound } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function ForgotPassword({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [tokenGenerated, setTokenGenerated] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useSocket();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      setSubmitted(true);
      if (data.resetToken) {
        setTokenGenerated(data.resetToken);
      }
      addToast({ title: 'Reset Instructions Sent', message: data.message, type: 'info' });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#24160f]">Reset Password</h1>
          <p className="text-xs text-stone-500">
            Enter your registered email address to receive password reset instructions.
          </p>
        </div>

        {!submitted ? (
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Processing...' : 'Send Reset Link'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold">Reset token generated for {email}!</p>
              {tokenGenerated && (
                <p className="text-[10px] text-stone-500 font-mono break-all bg-stone-50 p-2 rounded-lg border border-stone-200">
                  Token: {tokenGenerated}
                </p>
              )}
            </div>

            <button
              onClick={() => onNavigate('reset-password', { token: tokenGenerated })}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg transition"
            >
              Proceed to Enter New Password
            </button>
          </div>
        )}

        <div className="text-center text-xs text-stone-500">
          <button
            onClick={() => onNavigate('login')}
            className="text-amber-600 font-bold hover:underline"
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
