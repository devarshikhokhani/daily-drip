import React, { useState } from 'react';
import { Sparkles, ArrowRight, RefreshCw, Flame, Snowflake, ShoppingBag } from 'lucide-react';
import CupPreview from '../components/CupPreview';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';

export default function CoffeeMagic({ onNavigate }) {
  const { addToCart } = useCart();
  const { addToast } = useSocket();

  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    mood: 'Cozy & Relaxed',
    strength: 'Smooth & Balanced',
    sweetness: 'Subtle Touch (25%)',
    temperature: 'Hot',
    flavor: 'Caramel',
    energy: 'Calm & Balanced'
  });

  const [result, setResult] = useState(null);

  const moods = [
    { title: 'Cozy & Relaxed', desc: 'Warm comforting cup to unwind or read', icon: '🛋️' },
    { title: 'Deep Focus & Productivity', desc: 'Clean caffeine curve to get work done', icon: '💻' },
    { title: 'High Voltage Adventure', desc: 'Maximum adrenaline & bold extraction', icon: '⚡' },
    { title: 'Sweet Indulgence', desc: 'Treat yourself to rich dessert-like harmony', icon: '🍫' }
  ];

  const strengths = [
    { title: 'Bold & Intense', desc: 'Double dark extraction with thick crema' },
    { title: 'Smooth & Balanced', desc: 'Harmonious microfoam and medium roast' },
    { title: 'Light & Delicate', desc: 'Bright fruity acidity and low bitterness' }
  ];

  const sweetnessLevels = [
    { title: 'No Sugar', desc: 'Pure roastery terroir' },
    { title: 'Subtle Touch (25%)', desc: 'Just enough to round off roast' },
    { title: 'Normal (50%)', desc: 'Balanced sweet coffee harmony' },
    { title: 'Decadent (100%)', desc: 'Sweet golden confection' }
  ];

  const temperatures = [
    { title: 'Hot', icon: '☕', desc: 'Freshly steamed to 65°C' },
    { title: 'Warm', icon: '🌤️', desc: 'Drinkable velvety 55°C' },
    { title: 'Iced', icon: '🧊', desc: 'Cold extracted over crystal ice' }
  ];

  const flavors = [
    { title: 'Pure Roast', desc: 'Zero flavored syrup' },
    { title: 'Madagascar Vanilla', desc: 'Real crushed bourbon vanilla' },
    { title: 'Artisan Salted Caramel', desc: 'Rich buttery fleur de sel' },
    { title: 'Roasted Hazelnut', desc: 'Nutty warm aroma' },
    { title: 'Dark Belgian Chocolate', desc: '70% Callebaut ganache' }
  ];

  const calculateMatch = () => {
    let matchName = 'THE COZY ACHIEVER';
    let baseDrink = 'Latte';
    let size = 'Large';
    let milk = 'Oat';
    let sweet = 'Less';
    let temp = answers.temperature;
    let flav = 'Caramel';
    let addOns = ['Extra Shot'];

    let strengthPct = 72;
    let sweetPct = 64;
    let creamPct = 81;
    let chillPct = 20;
    let energyPct = 76;
    let rationale = '';

    if (answers.mood.includes('Focus') || answers.strength.includes('Bold')) {
      matchName = 'THE MIDNIGHT CATALYST';
      baseDrink = 'Cold Brew';
      size = 'Large';
      milk = 'None';
      sweet = 'No Sugar';
      temp = 'Iced';
      flav = 'None';
      addOns = ['Extra Shot'];
      strengthPct = 88;
      sweetPct = 15;
      creamPct = 20;
      chillPct = 90;
      energyPct = 95;
      rationale = 'Recommended for intense clarity: an extended cold drip with high natural caffeine and zero sugar crash.';
    } else if (answers.mood.includes('Sweet') || answers.sweetness.includes('Decadent')) {
      matchName = 'THE VELVET STRATEGIST';
      baseDrink = 'Mocha';
      size = 'Large';
      milk = 'Regular';
      sweet = 'Normal';
      temp = 'Hot';
      flav = 'Chocolate';
      addOns = ['Whipped Cream', 'Chocolate'];
      strengthPct = 65;
      sweetPct = 85;
      creamPct = 88;
      chillPct = 15;
      energyPct = 70;
      rationale = 'Recommended for pure comfort: Belgian chocolate ganache melted into silky steamed milk.';
    } else if (answers.temperature === 'Iced') {
      matchName = 'THE SUNBURST OPTIMIST';
      baseDrink = 'Latte';
      size = 'Medium';
      milk = 'Oat';
      sweet = 'Normal';
      temp = 'Iced';
      flav = 'Vanilla';
      addOns = ['Caramel'];
      strengthPct = 60;
      sweetPct = 70;
      creamPct = 78;
      chillPct = 92;
      energyPct = 75;
      rationale = 'Recommended for daytime refreshment: chilled oat milk cascading over double vanilla espresso.';
    } else {
      matchName = 'THE COZY ACHIEVER';
      baseDrink = 'Cappuccino';
      size = 'Large';
      milk = 'Oat';
      sweet = 'Less';
      temp = 'Hot';
      flav = 'Hazelnut';
      addOns = ['Extra Shot', 'Cinnamon'];
      strengthPct = 72;
      sweetPct = 64;
      creamPct = 81;
      chillPct = 20;
      energyPct = 76;
      rationale = 'Recommended for your relaxed yet focused mood: velvety microfoam with warm nutty hazelnut and single-origin backbone.';
    }

    setResult({
      matchName,
      baseDrink,
      size,
      milk,
      sweetness: sweet,
      temperature: temp,
      flavor: flav,
      addOns,
      stats: { strengthPct, sweetPct, creamPct, chillPct, energyPct },
      rationale
    });
  };

  const handleCreateThisCoffee = () => {
    if (!result) return;
    onNavigate('build-coffee', {
      baseDrink: result.baseDrink,
      size: result.size,
      milk: result.milk,
      sweetness: result.sweetness,
      temperature: result.temperature,
      flavor: result.flavor,
      addOns: result.addOns
    });
  };

  const handleOrderDirect = () => {
    const drinkName = [
      result.size && result.size !== 'undefined' ? result.size : null,
      result.flavor && result.flavor !== 'None' && result.flavor !== 'undefined' ? result.flavor : null,
      result.baseDrink && result.baseDrink !== 'undefined' ? result.baseDrink : 'Signature Blend'
    ].filter(Boolean).join(' ').trim() || 'Signature Coffee Blend';

    addToCart({
      name: drinkName,
      basePrice: 195,
      quantity: 1,
      customization: {
        baseDrink: result.baseDrink,
        size: result.size,
        milk: result.milk,
        sweetness: result.sweetness,
        temperature: result.temperature,
        flavor: result.flavor,
        addOns: result.addOns
      }
    });

    addToast({
      title: 'Match Added to Cart!',
      message: `${result.matchName} ordered`,
      type: 'success'
    });

    onNavigate('cart');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="text-xs font-mono uppercase text-amber-600 tracking-wider font-bold">
          ☕ Personalized Coffee Intelligence
        </span>
        <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#24160f]">
          Coffee Magic
        </h1>
        <p className="text-stone-500 text-sm">
          Tell us how you feel. We'll engineer your exact bean, roast, sweetness, and temperature match.
        </p>
      </div>

      {!result ? (
        <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 shadow-lg space-y-8">
          {/* Step 1: Mood */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-mono text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="text-base font-bold text-[#24160f]">What is your mood right now?</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {moods.map((m) => (
                <button
                  key={m.title}
                  onClick={() => setAnswers(prev => ({ ...prev, mood: m.title }))}
                  className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 ${
                    answers.mood === m.title
                      ? 'border-amber-500 bg-amber-50 text-[#24160f] shadow-md'
                      : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-600 hover:border-amber-300'
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <div>
                    <p className="text-sm font-bold">{m.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Temperature */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-mono text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="text-base font-bold text-[#24160f]">Hot, warm, or icy cold?</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {temperatures.map((t) => (
                <button
                  key={t.title}
                  onClick={() => setAnswers(prev => ({ ...prev, temperature: t.title }))}
                  className={`p-4 rounded-2xl border text-center transition ${
                    answers.temperature === t.title
                      ? 'border-amber-500 bg-amber-50 text-[#24160f] shadow-md'
                      : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-600 hover:border-amber-300'
                  }`}
                >
                  <span className="text-2xl block mb-1">{t.icon}</span>
                  <p className="text-sm font-bold">{t.title}</p>
                  <p className="text-[10px] text-stone-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Strength & Sweetness */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-mono text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="text-base font-bold text-[#24160f]">Roast Strength</h3>
              </div>
              <div className="space-y-2">
                {strengths.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => setAnswers(prev => ({ ...prev, strength: s.title }))}
                    className={`w-full p-3 rounded-xl border text-left transition ${
                      answers.strength === s.title
                        ? 'border-amber-500 bg-amber-50 text-[#24160f]'
                        : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-600 hover:border-amber-300'
                    }`}
                  >
                    <p className="text-xs font-bold">{s.title}</p>
                    <p className="text-[10px] text-stone-500">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-mono text-xs font-bold flex items-center justify-center">4</span>
                <h3 className="text-base font-bold text-[#24160f]">Sweetness Level</h3>
              </div>
              <div className="space-y-2">
                {sweetnessLevels.map((sw) => (
                  <button
                    key={sw.title}
                    onClick={() => setAnswers(prev => ({ ...prev, sweetness: sw.title }))}
                    className={`w-full p-3 rounded-xl border text-left transition ${
                      answers.sweetness === sw.title
                        ? 'border-amber-500 bg-amber-50 text-[#24160f]'
                        : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-600 hover:border-amber-300'
                    }`}
                  >
                    <p className="text-xs font-bold">{sw.title}</p>
                    <p className="text-[10px] text-stone-500">{sw.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-[#e8dfd5] flex justify-center">
            <button
              onClick={calculateMatch}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-xl transition transform hover:scale-105 flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              REVEAL MY COFFEE MATCH
            </button>
          </div>
        </div>
      ) : (
        /* Result Screen */
        <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-xs font-mono font-bold">
              ✨ YOUR PERFECT COFFEE MATCH
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-black text-[#24160f]">
              ☕ {result.matchName}
            </h2>
            <p className="text-stone-600 text-sm max-w-lg mx-auto leading-relaxed">
              {result.rationale}
            </p>
          </div>

          {/* Radar Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#faf7f2] p-4 rounded-2xl border border-[#e8dfd5]">
            <div className="text-center p-2">
              <span className="text-[10px] text-stone-500 uppercase font-mono block">☕ Strength</span>
              <span className="text-xl font-black text-amber-600">{result.stats.strengthPct}%</span>
            </div>
            <div className="text-center p-2">
              <span className="text-[10px] text-stone-500 uppercase font-mono block">🍯 Sweetness</span>
              <span className="text-xl font-black text-amber-600">{result.stats.sweetPct}%</span>
            </div>
            <div className="text-center p-2">
              <span className="text-[10px] text-stone-500 uppercase font-mono block">🥛 Creaminess</span>
              <span className="text-xl font-black text-amber-600">{result.stats.creamPct}%</span>
            </div>
            <div className="text-center p-2">
              <span className="text-[10px] text-stone-500 uppercase font-mono block">❄️ Chill</span>
              <span className="text-xl font-black text-sky-600">{result.stats.chillPct}%</span>
            </div>
            <div className="text-center p-2 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-stone-500 uppercase font-mono block">⚡ Energy</span>
              <span className="text-xl font-black text-amber-700">{result.stats.energyPct}%</span>
            </div>
          </div>

          {/* Drink Formulation Card */}
          <div className="p-5 rounded-2xl bg-[#fdf8f3] border border-[#e8dfd5] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase text-amber-600 font-bold">Recommended Drink Specs</span>
              <h4 className="text-lg font-bold text-[#24160f] mt-0.5">
                {result.size} {result.baseDrink}
              </h4>
              <p className="text-xs text-stone-600">
                {result.milk} Milk • {result.sweetness} Sugar • {result.temperature}
                {result.addOns.length > 0 && ` • +${result.addOns.join(', ')}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCreateThisCoffee}
                className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <Flame className="w-4 h-4" />
                CREATE THIS COFFEE
              </button>

              <button
                onClick={handleOrderDirect}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" />
                ORDER NOW (₹195)
              </button>
            </div>
          </div>

          {/* Try Again */}
          <div className="text-center">
            <button
              onClick={() => setResult(null)}
              className="text-xs text-stone-500 hover:text-stone-700 underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retake Quiz with different mood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
