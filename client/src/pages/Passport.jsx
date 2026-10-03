import React, { useState, useEffect } from 'react';
import { Compass, CheckCircle2, Lock, Award, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';

export default function Passport({ onNavigate }) {
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { addToast } = useSocket();

  const [passportData, setPassportData] = useState({
    passport: [],
    totalDiscovered: 0,
    totalGoals: 8,
    progressPercent: 0,
    isMasterExplorer: false
  });
  const [loading, setLoading] = useState(true);

  const fetchPassport = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('dd_token');
    try {
      const res = await fetch('/api/passport', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPassportData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassport();
  }, [isAuthenticated]);

  const handleOrderLockedDrink = (drinkName) => {
    addToCart({
      name: drinkName,
      basePrice: 185,
      quantity: 1,
      customization: { size: 'Medium (360ml)' }
    });

    addToast({
      title: 'Added for Discovery!',
      message: `${drinkName} added to cart. Complete order to stamp your passport!`,
      type: 'success'
    });

    onNavigate('cart');
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
          <Compass className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-[#24160f]">Digital Coffee Passport</h2>
        <p className="text-stone-500 text-sm">
          Please sign in to track your international specialty coffee discoveries across Italy, France, Japan, India, and more.
        </p>
        <button
          onClick={() => onNavigate('login')}
          className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm"
        >
          Sign In to Access Passport
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-xs font-mono font-bold">
          <Compass className="w-3.5 h-3.5" />
          <span>Global Roastery Passport</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#24160f]">
          Coffee Passport
        </h1>
        <p className="text-stone-500 text-sm">
          Discover traditional preparation rituals from world coffee capitals. Automatically stamped upon order completion.
        </p>
      </div>

      {/* Progress Card */}
      <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase text-amber-600 font-bold">Explorer Status</span>
            <h3 className="text-2xl font-bold text-[#24160f] flex items-center gap-2">
              <span>{passportData.totalDiscovered} / {passportData.totalGoals} Drinks Discovered</span>
              {passportData.isMasterExplorer && (
                <Award className="w-6 h-6 text-amber-500 fill-amber-400" />
              )}
            </h3>
            <p className="text-xs text-stone-500">
              {passportData.totalGoals - passportData.totalDiscovered} international regional recipes remaining to unlock Master Explorer status.
            </p>
          </div>

          <div className="sm:text-right shrink-0">
            <span className="text-4xl font-black font-mono text-amber-600">
              {passportData.progressPercent}%
            </span>
            <span className="block text-[10px] font-mono uppercase text-stone-400">Completion</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#f4eee6] h-3 rounded-full mt-6 overflow-hidden p-0.5 border border-[#e8dfd5]">
          <div
            className="bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500 h-full rounded-full transition-all duration-1000"
            style={{ width: `${passportData.progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Passport Stamps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {passportData.passport.map((stamp, idx) => (
          <div
            key={stamp.name}
            className={`p-5 rounded-2xl border transition-all ${
              stamp.discovered
                ? 'bg-white border-amber-300 shadow-md'
                : 'bg-[#faf7f2] border-[#e8dfd5] opacity-80'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-xl bg-[#f4eee6] border border-[#e8dfd5]">
                  {stamp.flag}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-amber-700 font-bold">{stamp.country}</span>
                    {stamp.discovered ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-stone-500 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-[#24160f] mt-1">{stamp.name}</h4>
                  <p className="text-xs text-stone-500 mt-0.5">{stamp.notes}</p>
                </div>
              </div>

              {!stamp.discovered && (
                <button
                  onClick={() => handleOrderLockedDrink(stamp.name)}
                  className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 text-xs font-bold transition shrink-0 flex items-center gap-1"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Order
                </button>
              )}
            </div>

            {stamp.discovered && stamp.discoveredAt && (
              <div className="mt-3 pt-3 border-t border-[#e8dfd5] text-[10px] font-mono text-stone-400 flex justify-between">
                <span>Stamped On</span>
                <span>{new Date(stamp.discoveredAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
