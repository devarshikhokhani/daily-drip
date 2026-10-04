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

// Helper: Safely encode DNA profile into compact URL parameter for 100% portable QR/sharing
const encodeRecipeToParam = (dna) => {
  try {
    const compact = {
      i: dna.id,
      d: dna.drink_name,
      p: dna.personality_name,
      f: dna.flavor_profile,
      s: dna.strength_pct,
      w: dna.sweetness_pct,
      c: dna.creaminess_pct,
      h: dna.chill_pct,
      e: dna.energy_pct,
      pr: dna.price || dna.customization?.price,
      cz: dna.customization
    };
    return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(compact)))));
  } catch (err) {
    return '';
  }
};

// Helper: Safely decode recipe from URL parameter
const decodeRecipeFromParam = (param) => {
  try {
    if (!param) return null;
    const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(param))));
    const c = JSON.parse(jsonStr);
    if (!c || !c.d) return null;
    return {
      id: c.i || 'DNA-1001',
      drink_name: c.d,
      personality_name: c.p || 'THE COZY ACHIEVER',
      flavor_profile: c.f || 'Custom handcrafted coffee DNA profile',
      strength_pct: c.s !== undefined ? c.s : 75,
      sweetness_pct: c.w !== undefined ? c.w : 50,
      creaminess_pct: c.c !== undefined ? c.c : 75,
      chill_pct: c.h !== undefined ? c.h : 20,
      energy_pct: c.e !== undefined ? c.e : 80,
      price: c.pr || 220,
      customization: c.cz || {},
      created_at: new Date().toISOString()
    };
  } catch (err) {
    return null;
  }
};

// Helper: Build complete DNA profile object from customization data
const buildDnaFromCustomization = (data, preferredId = null) => {
  const custom = data.customization || {};
  const preview = data.previewDna || {};
  const drinkName = data.drinkName || custom.baseCoffee || 'Custom Specialty Brew';
  const id = preferredId || data.id || custom.id || `DNA-${Math.floor(1000 + Math.random() * 9000)}`;

  const strength = preview.strength !== undefined
    ? preview.strength
    : (custom.baseCoffee === 'Espresso' ? 95 : custom.baseCoffee === 'Cold Brew' ? 88 : custom.baseCoffee === 'Americano' ? 80 : 70);
  const sweetness = preview.sweetness !== undefined
    ? preview.sweetness
    : (custom.sweetness?.includes('Less') ? 38 : custom.sweetness?.includes('No') ? 10 : custom.sweetness?.includes('Extra') ? 90 : 60);
  const creaminess = preview.creaminess !== undefined
    ? preview.creaminess
    : (custom.milk?.includes('None') ? 18 : custom.milk?.includes('Oat') ? 82 : custom.milk?.includes('Almond') ? 70 : 85);
  const chill = preview.chill !== undefined
    ? preview.chill
    : (custom.temperature === 'Iced' ? 88 : custom.temperature === 'Warm' ? 35 : 15);
  const energy = preview.energy !== undefined
    ? preview.energy
    : (custom.addOns?.includes('Extra Shot') ? 92 : 75);

  let personality = preview.personality ? preview.personality.toUpperCase() : 'THE COZY ACHIEVER';
  if (!preview.personality) {
    if (chill >= 70 && energy >= 80) personality = 'THE MIDNIGHT CATALYST';
    else if (chill >= 70) personality = 'THE POLAR OPTIMIST';
    else if (strength >= 80 && sweetness <= 30) personality = 'THE ARTISAN PURIST';
    else if (creaminess >= 75 && sweetness >= 60) personality = 'THE VELVET STRATEGIST';
    else if (sweetness >= 70) personality = 'THE SUNBURST OPTIMIST';
    else if (strength >= 75) personality = 'THE HIGH-VOLTAGE CRAFTSMAN';
    else personality = 'THE COZY ACHIEVER';
  }

  let flavor = 'Custom handcrafted formula with rich aromatic notes and balanced extraction';
  if (personality.includes('MIDNIGHT')) flavor = 'Crisp, high-voltage cold brew rush with low acidity and dark chocolate hints';
  else if (personality.includes('POLAR')) flavor = 'Playful, refreshing iced infusion with vibrant chill and smooth finish';
  else if (personality.includes('ARTISAN')) flavor = 'Bold, intense single-origin dark roast with bittersweet chocolate finish';
  else if (personality.includes('VELVET')) flavor = 'Velvety sweetness with smooth roasted notes and silky microfoam';
  else if (personality.includes('SUNBURST')) flavor = 'Bright candied vanilla notes with playful warmth and cheerful lift';
  else if (personality.includes('HIGH-VOLTAGE')) flavor = 'Robust double-extracted espresso notes with focused stamina and crisp finish';
  else flavor = 'Velvety balanced coffee with smooth comforting microfoam and roasted undertones';

  return {
    id,
    drink_name: drinkName,
    personality_name: personality,
    flavor_profile: flavor,
    strength_pct: strength,
    sweetness_pct: sweetness,
    creaminess_pct: creaminess,
    chill_pct: chill,
    energy_pct: energy,
    price: data.price || custom.price || 220,
    customization: custom,
    created_at: new Date().toISOString()
  };
};

export default function CoffeeDna({ onNavigate, dnaId = null, initialCreateData = null, recipeParam = null }) {
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
    // 1. If explicit initialCreateData passed (from Build Coffee or Home/Menu)
    if (initialCreateData) {
      const immediateDna = buildDnaFromCustomization(initialCreateData, dnaId || initialCreateData.id);
      loadDnaRecord(immediateDna);

      // Persist in localStorage so reopening the link restores this exact Coffee DNA
      try {
        localStorage.setItem('dd_active_coffee_dna', JSON.stringify(immediateDna));
        localStorage.setItem(`dd_coffee_dna_${immediateDna.id}`, JSON.stringify(immediateDna));
      } catch (e) {}

      // Update URL to match DNA ID without reloading
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', `/coffee-dna/${immediateDna.id}`);
      }

      // Sync to backend asynchronously
      const token = localStorage.getItem('dd_token');
      fetch('/api/coffee-dna', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          drinkName: immediateDna.drink_name,
          customization: immediateDna.customization,
          id: immediateDna.id
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.dna) {
            try {
              localStorage.setItem('dd_active_coffee_dna', JSON.stringify(data.dna));
              localStorage.setItem(`dd_coffee_dna_${data.dna.id}`, JSON.stringify(data.dna));
            } catch (e) {}
          }
        })
        .catch(err => console.warn('Background sync of DNA record:', err));
      return;
    }

    // 2. If URL contains an encoded recipe query parameter (?recipe=... or ?r=...)
    if (recipeParam) {
      const decoded = decodeRecipeFromParam(recipeParam);
      if (decoded) {
        if (dnaId) decoded.id = dnaId;
        loadDnaRecord(decoded);
        try {
          localStorage.setItem('dd_active_coffee_dna', JSON.stringify(decoded));
          localStorage.setItem(`dd_coffee_dna_${decoded.id}`, JSON.stringify(decoded));
        } catch (e) {}
        return;
      }
    }

    // 3. If explicit dnaId in URL (/coffee-dna/:id)
    if (dnaId) {
      fetchDnaById(dnaId);
      return;
    }

    // 4. Default: User visited /coffee-dna directly — check localStorage first for their active or pending build!
    try {
      const savedActive = localStorage.getItem('dd_active_coffee_dna');
      if (savedActive) {
        const parsed = JSON.parse(savedActive);
        if (parsed && parsed.id) {
          loadDnaRecord(parsed);
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', `/coffee-dna/${parsed.id}`);
          }
          return;
        }
      }

      const pending = localStorage.getItem('dd_pending_coffee_dna');
      if (pending) {
        const parsedPending = JSON.parse(pending);
        if (parsedPending) {
          const generated = buildDnaFromCustomization(parsedPending);
          loadDnaRecord(generated);
          localStorage.setItem('dd_active_coffee_dna', JSON.stringify(generated));
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', `/coffee-dna/${generated.id}`);
          }
          return;
        }
      }
    } catch (e) {}

    // 5. Fallback: Fetch latest record or default profile
    fetchDefaultDna();
  }, [dnaId, initialCreateData, recipeParam]);

  const generateDeterministicDna = (id) => {
    const rawId = (id || 'DNA-8492').toUpperCase();

    // Check if cached locally first
    try {
      const cached = localStorage.getItem(`dd_coffee_dna_${rawId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id === rawId) return parsed;
      }
    } catch (e) {}

    const digits = rawId.replace(/\D/g, '') || '8492';
    const num = parseInt(digits, 10);

    const presets = [
      {
        personality: 'THE VELVET STRATEGIST',
        drink: 'Large Caramel Oat Latte',
        flavor: 'Velvety sweetness with smooth roasted caramel notes and warm oat microfoam',
        strength: 78, sweetness: 58, creaminess: 85, chill: 15, energy: 80,
        base: 'Latte', milk: 'Oat Milk', temp: 'Hot', sweetnessChoice: 'Less Sweet (25%)', price: 295
      },
      {
        personality: 'THE MIDNIGHT CATALYST',
        drink: 'Nitro Cold Brew High Voltage',
        flavor: 'Crisp, high-voltage cold brew rush with low acidity and dark chocolate hints',
        strength: 92, sweetness: 25, creaminess: 15, chill: 90, energy: 95,
        base: 'Cold Brew', milk: 'None', temp: 'Iced', sweetnessChoice: 'Less Sweet (25%)', price: 240
      },
      {
        personality: 'THE ARTISAN PURIST',
        drink: 'Double Origin Ristretto Espresso',
        flavor: 'Bold, intense single-origin dark roast with bittersweet chocolate finish',
        strength: 95, sweetness: 15, creaminess: 20, chill: 15, energy: 90,
        base: 'Espresso', milk: 'None', temp: 'Hot', sweetnessChoice: 'No Sugar', price: 180
      },
      {
        personality: 'THE COZY ACHIEVER',
        drink: 'Medium Vanilla Cappuccino',
        flavor: 'Velvety balanced coffee with smooth comforting microfoam and roasted undertones',
        strength: 75, sweetness: 55, creaminess: 80, chill: 20, energy: 75,
        base: 'Cappuccino', milk: 'Whole Milk', temp: 'Hot', sweetnessChoice: 'Normal (50%)', price: 260
      },
      {
        personality: 'THE SUNBURST OPTIMIST',
        drink: 'Iced Vanilla Bean Blonde Latte',
        flavor: 'Bright candied vanilla notes with playful warmth and refreshing ice infusion',
        strength: 65, sweetness: 75, creaminess: 75, chill: 88, energy: 70,
        base: 'Latte', milk: 'Almond Milk', temp: 'Iced', sweetnessChoice: 'Extra Sweet (100%)', price: 285
      },
      {
        personality: 'THE HIGH-VOLTAGE CRAFTSMAN',
        drink: 'Double Shot Americano On Rocks',
        flavor: 'Robust double-extracted espresso notes with focused stamina and crisp finish',
        strength: 90, sweetness: 20, creaminess: 22, chill: 85, energy: 92,
        base: 'Americano', milk: 'None', temp: 'Iced', sweetnessChoice: 'No Sugar', price: 220
      }
    ];

    const pick = presets[Math.abs(num) % presets.length];
    return {
      id: rawId,
      drink_name: pick.drink,
      personality_name: pick.personality,
      flavor_profile: pick.flavor,
      strength_pct: pick.strength,
      sweetness_pct: pick.sweetness,
      creaminess_pct: pick.creaminess,
      chill_pct: pick.chill,
      energy_pct: pick.energy,
      price: pick.price,
      customization: {
        baseDrink: pick.base,
        size: 'Large (480ml)',
        milk: pick.milk,
        sweetness: pick.sweetnessChoice,
        temperature: pick.temp,
        price: pick.price
      },
      created_at: new Date().toISOString()
    };
  };

  const fetchDnaById = async (id) => {
    setLoading(true);

    // Check local storage first
    try {
      const cached = localStorage.getItem(`dd_coffee_dna_${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id === id) {
          loadDnaRecord(parsed);
          return;
        }
      }
    } catch (e) {}

    // Check backend
    try {
      const res = await fetch(`/api/coffee-dna/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          loadDnaRecord(data);
          try {
            localStorage.setItem(`dd_coffee_dna_${data.id}`, JSON.stringify(data));
            localStorage.setItem('dd_active_coffee_dna', JSON.stringify(data));
          } catch (e) {}
          return;
        }
      }
    } catch (e) {
      console.warn('API fetch failed, loading generated profile for DNA:', id, e);
    }

    loadDnaRecord(generateDeterministicDna(id));
  };

  const fetchDefaultDna = async () => {
    setLoading(true);

    // Try fetching latest created DNA from database first
    try {
      const resLatest = await fetch('/api/coffee-dna/latest/record');
      if (resLatest.ok) {
        const data = await resLatest.json();
        if (data && data.id) {
          loadDnaRecord(data);
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', `/coffee-dna/${data.id}`);
          }
          return;
        }
      }
    } catch (e) {}

    try {
      const res = await fetch('/api/coffee-dna/DNA-8492');
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          loadDnaRecord(data);
          return;
        }
      }
    } catch (e) {}

    loadDnaRecord(generateDeterministicDna('DNA-8492'));
  };

  const loadDnaRecord = async (dna) => {
    setCurrentDna(dna);
    setLoading(false);

    // Persist in localStorage so reopen / refresh keeps this DNA
    try {
      localStorage.setItem('dd_active_coffee_dna', JSON.stringify(dna));
      if (dna.id) {
        localStorage.setItem(`dd_coffee_dna_${dna.id}`, JSON.stringify(dna));
      }
    } catch (e) {}

    // Generate portable share URL including encoded recipe parameter
    const baseUrl = getCoffeeDnaUrl(dna.id);
    const recipeParamStr = encodeRecipeToParam(dna);
    const fullShareUrl = recipeParamStr ? `${baseUrl}?recipe=${recipeParamStr}` : baseUrl;
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
    const orderPrice = currentDna.price || currentDna.customization?.price || 220;
    addToCart({
      name: currentDna.drink_name,
      basePrice: orderPrice,
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
                <span>ORDER THIS EXACT RECIPE (₹{currentDna.price || currentDna.customization?.price || 220})</span>
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
