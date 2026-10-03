import React, { useState, useEffect } from 'react';
import {
  User,
  Coffee,
  Compass,
  Layers,
  Award,
  Edit3,
  Calendar,
  X,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Profile({ onNavigate }) {
  const { user, isAuthenticated, updateUser } = useAuth();
  const { addToast } = useSocket();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFavCoffee, setEditFavCoffee] = useState('');

  const fetchProfile = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('dd_token');
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        setEditName(data.user.name);
        setEditFavCoffee(data.user.favoriteCoffee || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [isAuthenticated]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('dd_token');

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          favoriteCoffee: editFavCoffee
        })
      });

      const data = await res.json();
      if (res.ok) {
        updateUser(data.user);
        setProfileData(prev => ({ ...prev, user: data.user }));
        setEditModalOpen(false);
        addToast({ title: 'Profile Updated', message: 'Your changes have been saved.', type: 'success' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <User className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-2xl font-bold text-[#24160f]">Sign In to View Profile</h2>
        <button
          onClick={() => onNavigate('login')}
          className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-stone-400 space-y-3">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-mono uppercase tracking-wider">Loading profile...</p>
      </div>
    );
  }

  const stats = profileData?.stats || { totalOrders: 0, completedOrders: 0, dnaCount: 0, passportCount: 0, loyaltyPoints: 0, drinksUntilReward: 5 };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Profile Card */}
      <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <img
              src={profileData?.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name}`}
              alt={profileData?.user?.name}
              className="w-24 h-24 rounded-2xl border-2 border-amber-400/60 object-cover shadow-lg"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#24160f]">
                  {profileData?.user?.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase">
                  {profileData?.user?.role}
                </span>
              </div>
              <p className="text-xs text-stone-500">{profileData?.user?.email}</p>
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-stone-600">
                <span className="flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-600" />
                  Fav: <strong className="text-amber-700">{profileData?.user?.favoriteCoffee || 'Double Ristretto'}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-stone-400 font-mono text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  Member since {new Date(profileData?.user?.createdAt || Date.now()).getFullYear()}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setEditModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#faf7f2] hover:bg-amber-50 text-[#24160f] text-xs font-bold border border-[#e8dfd5] transition flex items-center gap-1.5 shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-[#e8dfd5]">
          <div className="bg-[#faf7f2] p-4 rounded-2xl border border-[#e8dfd5] text-center">
            <span className="text-[10px] font-mono uppercase text-stone-500 block">Total Orders</span>
            <span className="text-2xl font-black text-amber-600 font-mono">{stats.totalOrders}</span>
          </div>

          <div className="bg-[#faf7f2] p-4 rounded-2xl border border-[#e8dfd5] text-center">
            <span className="text-[10px] font-mono uppercase text-stone-500 block">Loyalty Points</span>
            <span className="text-2xl font-black text-amber-700 font-mono">{stats.loyaltyPoints}</span>
            <span className="text-[9px] text-stone-400 block">({stats.drinksUntilReward} until reward)</span>
          </div>

          <div className="bg-[#faf7f2] p-4 rounded-2xl border border-[#e8dfd5] text-center">
            <span className="text-[10px] font-mono uppercase text-stone-500 block">Passport Stamps</span>
            <span className="text-2xl font-black text-emerald-600 font-mono">{stats.passportCount}</span>
            <span className="text-[9px] text-stone-400 block">discovered drinks</span>
          </div>

          <div className="bg-[#faf7f2] p-4 rounded-2xl border border-[#e8dfd5] text-center">
            <span className="text-[10px] font-mono uppercase text-stone-500 block">Coffee DNAs</span>
            <span className="text-2xl font-black text-sky-600 font-mono">{stats.dnaCount}</span>
            <span className="text-[9px] text-stone-400 block">recipes created</span>
          </div>
        </div>
      </div>

      {/* Coffee DNA & Passport Quick Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Latest DNA */}
        <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-amber-700 font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Latest Coffee DNA
            </span>
            <button onClick={() => onNavigate('coffee-dna')} className="text-xs text-amber-600 font-bold hover:underline">
              View All
            </button>
          </div>

          {profileData?.latestDna ? (
            <div className="bg-[#faf7f2] p-4 rounded-2xl border border-[#e8dfd5] space-y-2">
              <span className="text-[10px] font-mono text-amber-600 font-bold block">
                #{profileData.latestDna.id}
              </span>
              <h4 className="text-lg font-bold text-[#24160f]">{profileData.latestDna.personality_name}</h4>
              <p className="text-xs text-stone-500">{profileData.latestDna.drink_name}</p>
              <div className="pt-2 flex justify-between text-[11px] font-mono text-stone-600">
                <span>Strength: {profileData.latestDna.strength_pct}%</span>
                <span>Sweet: {profileData.latestDna.sweetness_pct}%</span>
                <span>Chill: {profileData.latestDna.chill_pct}%</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-500">No Coffee DNA created yet.</p>
          )}
        </div>

        {/* Passport Status */}
        <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-amber-700 font-bold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              Passport Discoveries
            </span>
            <button onClick={() => onNavigate('passport')} className="text-xs text-amber-600 font-bold hover:underline">
              View Passport
            </button>
          </div>

          <div className="bg-[#faf7f2] p-4 rounded-2xl border border-[#e8dfd5] space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-600">Global Coffee Discoveries</span>
              <span className="font-bold text-amber-700 font-mono">{stats.passportCount} of 8 Unlocked</span>
            </div>
            <div className="w-full bg-[#f4eee6] h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((stats.passportCount / 8) * 100)}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-stone-500">
              Each unique international drink ordered unlocks a new digital passport stamp.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e8dfd5] rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 rounded-full bg-[#faf7f2] border border-[#e8dfd5]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#24160f] mb-4">Edit Profile Details</h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase text-stone-500 font-semibold block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-4 py-2.5 text-xs text-[#24160f] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-stone-500 font-semibold block mb-1">
                  Favorite Coffee
                </label>
                <input
                  type="text"
                  value={editFavCoffee}
                  onChange={(e) => setEditFavCoffee(e.target.value)}
                  placeholder="e.g. Madagascar Vanilla Bean Latte"
                  className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-4 py-2.5 text-xs text-[#24160f] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
