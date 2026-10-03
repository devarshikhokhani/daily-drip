import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Layers,
  Sparkles,
  Share2,
  QrCode,
  ThumbsUp,
  ThumbsDown,
  ShoppingBag,
  Copy,
  Check,
  Calendar,
  Flame,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import CupPreview from '../components/CupPreview';
import { getCoffeeDnaUrl } from '../utils/urlHelper';

export default function CoffeeDna({ onNavigate, dnaId = null, initialCreateData = null }) {
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { addToast } = useSocket();

  const [currentDna, setCurrentDna] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [voted, setVoted] = useState(null);
  const [yesCount, setYesCount] = useState(14);
  const [noCount, setNoCount] = useState(2);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialCreateData) {
      const token = localStorage.getItem('dd_token');
      fetch('/api/coffee-dna', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(initialCreateData)
      })
        .then(res => res.json())
        .then(data => {
          if (data.dna) {
            loadDnaRecord(data.dna);
          }
        })
        .catch(err => console.error(err));
    } else if (dnaId) {
      fetchDnaById(dnaId);
    } else {
      fetchDefaultDna();
    }
  }, [dnaId, initialCreateData]);

  const fetchDnaById = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coffee-dna/${id}`);
      if (res.ok) {
        const data = await res.json();
        loadDnaRecord(data);
      } else {
        fetchDefaultDna();
      }
    } catch (e) {
      console.error(e);
      fetchDefaultDna();
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultDna = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coffee-dna/DNA-8492');
      if (res.ok) {
        const data = await res.json();
        loadDnaRecord(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDnaRecord = async (dna) => {
    setCurrentDna(dna);
    const fullShareUrl = getCoffeeDnaUrl(dna.id);
    setShareUrl(fullShareUrl);

    try {
      const qrUrl = await QRCode.toDataURL(fullShareUrl, {
        width: 320,
        margin: 1,
        color: {
          dark: '#24160f',
          light: '#ffffff'
        }
      });
      setQrDataUrl(qrUrl);
    } catch (qrErr) {
      console.error('QR code generation failed:', qrErr);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    addToast({ title: 'Link Copied', message: 'Coffee DNA URL copied to clipboard!', type: 'success' });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleVote = (type) => {
    if (voted) return;
    setVoted(type);
    if (type === 'yes') setYesCount(c => c + 1);
    else setNoCount(c => c + 1);
    addToast({
      title: type === 'yes' ? 'Voted YES! ☕' : 'Voted NO',
      message: 'Your feedback on this Coffee DNA profile has been recorded.',
      type: 'info'
    });
  };

  const handleOrderThisDna = () => {
    if (!currentDna) return;
    addToCart({
      name: currentDna.drink_name,
      basePrice: 220,
      quantity: 1,
      customization: currentDna.customization || {},
      coffeeDnaId: currentDna.id
    });

    addToast({
      title: 'Added to Cart',
      message: `Coffee DNA ${currentDna.id} added to order!`,
      type: 'success'
    });

    onNavigate('cart');
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-[#785b46] space-y-3">
        <div className="w-10 h-10 border-2 border-[#b45309] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-mono uppercase tracking-wider">Decoding Coffee DNA...</p>
      </div>
    );
  }

  if (!currentDna) {
    return (
      <div className="py-20 text-center text-[#785b46] space-y-3">
        <p>No Coffee DNA found.</p>
        <button onClick={() => onNavigate('build-coffee')} className="px-4 py-2 bg-[#b45309] text-white rounded-xl text-xs font-bold">
          Create One Now
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4eee6] border border-[#e8dfd5] text-[#b45309] text-xs font-mono font-bold">
          <Layers className="w-3.5 h-3.5" />
          <span>Verified Coffee DNA Record</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#24160f]">
          {currentDna.personality_name}
        </h1>
        <p className="text-[#5c4033] text-sm">
          {currentDna.flavor_profile}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: DNA Certificate Card */}
        <div className="lg:col-span-7 bg-white border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden space-y-6">
          {/* Top Bar with ID */}
          <div className="flex items-center justify-between border-b border-[#f0e8df] pb-4">
            <div>
              <span className="text-[10px] font-mono text-[#785b46] uppercase tracking-widest block">
                Official Identifier
              </span>
              <span className="text-xl font-mono font-black text-[#b45309] tracking-wider">
                #{currentDna.id}
              </span>
            </div>

            <div className="text-right text-xs text-[#785b46] font-mono">
              <span className="block text-[10px] uppercase">Registered Date</span>
              <span>{new Date(currentDna.created_at || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Drink & Creator Info */}
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase text-[#b45309] font-bold">Drink Formulation</span>
            <h3 className="text-2xl font-bold text-[#24160f]">
              {currentDna.drink_name}
            </h3>
            {currentDna.creator_name && (
              <p className="text-xs text-[#785b46] flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-[#b45309]" />
                Crafted by {currentDna.creator_name}
              </p>
            )}
          </div>

          {/* 5 Core DNA Metrics Bar Indicators */}
          <div className="bg-[#faf7f2] p-5 rounded-2xl border border-[#e8dfd5] space-y-3.5">
            <h4 className="text-xs font-mono uppercase text-[#b45309] tracking-wider font-bold">
              DNA Spectral Analysis
            </h4>

            {/* Strength */}
            <div>
              <div className="flex justify-between text-xs text-[#24160f] mb-1 font-medium">
                <span>☕ Strength</span>
                <span className="font-bold text-[#b45309] font-mono">{currentDna.strength_pct}%</span>
              </div>
              <div className="w-full bg-[#eadecc] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#b45309] h-full rounded-full transition-all duration-700" style={{ width: `${currentDna.strength_pct}%` }}></div>
              </div>
            </div>

            {/* Sweetness */}
            <div>
              <div className="flex justify-between text-xs text-[#24160f] mb-1 font-medium">
                <span>🍯 Sweetness</span>
                <span className="font-bold text-[#d97706] font-mono">{currentDna.sweetness_pct}%</span>
              </div>
              <div className="w-full bg-[#eadecc] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#d97706] h-full rounded-full transition-all duration-700" style={{ width: `${currentDna.sweetness_pct}%` }}></div>
              </div>
            </div>

            {/* Creaminess */}
            <div>
              <div className="flex justify-between text-xs text-[#24160f] mb-1 font-medium">
                <span>🥛 Creaminess</span>
                <span className="font-bold text-[#a16207] font-mono">{currentDna.creaminess_pct}%</span>
              </div>
              <div className="w-full bg-[#eadecc] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#a16207] h-full rounded-full transition-all duration-700" style={{ width: `${currentDna.creaminess_pct}%` }}></div>
              </div>
            </div>

            {/* Chill */}
            <div>
              <div className="flex justify-between text-xs text-[#24160f] mb-1 font-medium">
                <span>❄️ Chill</span>
                <span className="font-bold text-[#0284c7] font-mono">{currentDna.chill_pct}%</span>
              </div>
              <div className="w-full bg-[#eadecc] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#0284c7] h-full rounded-full transition-all duration-700" style={{ width: `${currentDna.chill_pct}%` }}></div>
              </div>
            </div>

            {/* Energy */}
            <div>
              <div className="flex justify-between text-xs text-[#24160f] mb-1 font-medium">
                <span>⚡ Energy</span>
                <span className="font-bold text-[#c2410c] font-mono">{currentDna.energy_pct}%</span>
              </div>
              <div className="w-full bg-[#eadecc] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#c2410c] h-full rounded-full transition-all duration-700" style={{ width: `${currentDna.energy_pct}%` }}></div>
              </div>
            </div>
          </div>

          {/* Exact Recipe Ingredients */}
          {currentDna.customization && (
            <div className="bg-[#faf7f2] p-4 rounded-xl border border-[#e8dfd5] text-xs text-[#5c4033] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#b45309] font-bold block">
                Recipe Parameters
              </span>
              <p>
                Size: <strong className="text-[#24160f]">{currentDna.customization.size || 'Medium'}</strong> •
                Milk: <strong className="text-[#24160f]">{currentDna.customization.milk || 'Standard'}</strong> •
                Sugar: <strong className="text-[#24160f]">{currentDna.customization.sweetness || 'Normal'}</strong> •
                Temp: <strong className="text-[#24160f]">{currentDna.customization.temperature || 'Hot'}</strong>
              </p>
              {currentDna.customization.addOns && currentDna.customization.addOns.length > 0 && (
                <p>
                  Add-ons: <strong className="text-[#b45309]">{currentDna.customization.addOns.join(', ')}</strong>
                </p>
              )}
            </div>
          )}

          {/* Social Feedback / Voting */}
          <div className="pt-2 border-t border-[#f0e8df] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#5c4033]">
              <span>Would you drink this exact Coffee DNA?</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleVote('yes')}
                disabled={voted !== null}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  voted === 'yes'
                    ? 'bg-[#4d6344] text-white shadow-sm'
                    : 'bg-[#faf7f2] text-[#5c4033] hover:bg-[#edf6ed] hover:text-[#1b5e20] border border-[#e8dfd5]'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>YES ({yesCount})</span>
              </button>

              <button
                onClick={() => handleVote('no')}
                disabled={voted !== null}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  voted === 'no'
                    ? 'bg-[#c2410c] text-white shadow-sm'
                    : 'bg-[#faf7f2] text-[#5c4033] hover:bg-[#fdeded] hover:text-[#c2410c] border border-[#e8dfd5]'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>NO ({noCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Real Scannable QR Code & Sharing */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-[#b45309] tracking-wider font-bold">
              <QrCode className="w-4 h-4" />
              <span>Real Scannable QR Code</span>
            </div>

            {/* Real QR Code Graphic */}
            <div className="p-4 bg-[#faf7f2] rounded-2xl inline-block shadow-sm border border-[#e8dfd5] max-w-[240px] mx-auto">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR for Coffee DNA ${currentDna.id}`}
                  className="w-full h-auto aspect-square object-contain rounded-xl bg-white p-2"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-[#785b46] font-mono text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <p className="text-xs text-[#5c4033] max-w-xs mx-auto leading-relaxed">
              Scan with any mobile camera to view this public Coffee DNA profile directly without signing in!
            </p>

            {/* Shareable Link Input */}
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] font-mono focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-[#b45309] hover:bg-[#92400e] text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Order This Exact Drink CTA */}
            <div className="pt-2">
              <button
                onClick={handleOrderThisDna}
                className="w-full py-3.5 rounded-2xl bg-[#b45309] hover:bg-[#92400e] text-white font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>ORDER THIS EXACT RECIPE (₹220)</span>
              </button>
            </div>
          </div>

          {/* Quick link to build new DNA */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-5 text-center space-y-2 shadow-sm">
            <h4 className="text-sm font-bold text-[#24160f]">Want to generate your own Coffee DNA?</h4>
            <p className="text-xs text-[#5c4033]">
              Customize size, milk, sweetness, and temperature in our Interactive Builder.
            </p>
            <button
              onClick={() => onNavigate('build-coffee')}
              className="text-xs font-bold text-[#b45309] hover:text-[#92400e] inline-flex items-center gap-1 mt-1"
            >
              Open Coffee Builder <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
