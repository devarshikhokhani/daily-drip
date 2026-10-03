import React, { useState, useEffect } from 'react';
import {
  Flame,
  Snowflake,
  ShoppingBag,
  Sparkles,
  Layers,
  Radio,
  CheckCircle,
  Plus,
  RefreshCw,
  QrCode
} from 'lucide-react';
import CupPreview from '../components/CupPreview';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';

export default function BuildCoffee({ onNavigate, initialPreset = null }) {
  const { addToCart } = useCart();
  const { addToast } = useSocket();

  const coffeeBases = [
    { name: 'Latte', basePrice: 160, desc: 'Silky microfoam over double espresso' },
    { name: 'Cappuccino', basePrice: 155, desc: 'Equal parts espresso, milk & dense froth' },
    { name: 'Espresso', basePrice: 130, desc: 'Double single-origin ristretto extraction' },
    { name: 'Americano', basePrice: 140, desc: 'Hot filtered water poured over espresso' },
    { name: 'Cold Brew', basePrice: 175, desc: '18-hour cold steeped single origin' },
    { name: 'Mocha', basePrice: 185, desc: 'Belgian ganache melted into espresso' }
  ];

  const [baseCoffee, setBaseCoffee] = useState(initialPreset?.baseDrink || 'Latte');
  const [size, setSize] = useState(initialPreset?.size || 'Large');
  const [milk, setMilk] = useState(initialPreset?.milk || 'Oat');
  const [sweetness, setSweetness] = useState(initialPreset?.sweetness || 'Less');
  const [temperature, setTemperature] = useState(initialPreset?.temperature || 'Hot');
  const [flavor, setFlavor] = useState(initialPreset?.flavor || 'Caramel');
  const [addOns, setAddOns] = useState(initialPreset?.addOns || ['Extra Shot']);
  const [price, setPrice] = useState(185);

  useEffect(() => {
    const selectedBase = coffeeBases.find(b => b.name === baseCoffee) || coffeeBases[0];
    let total = selectedBase.basePrice;

    if (size === 'Medium') total += 25;
    if (size === 'Large') total += 45;

    if (milk === 'Oat' || milk === 'Almond') total += 35;
    if (milk === 'Soy') total += 25;

    if (flavor && flavor !== 'None') {
      if (flavor === 'Chocolate' || flavor === 'Mocha') total += 30;
      else total += 25;
    }

    for (const a of addOns) {
      if (a === 'Extra Shot') total += 40;
      else if (a === 'Whipped Cream') total += 30;
      else if (a === 'Caramel' || a === 'Chocolate') total += 20;
      else if (a === 'Cinnamon') total += 10;
    }

    setPrice(total);
  }, [baseCoffee, size, milk, sweetness, temperature, flavor, addOns]);

  const toggleAddOn = (name) => {
    setAddOns(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const handleAddToCart = () => {
    const formattedName = [
      size && size !== 'undefined' ? size : 'Large',
      flavor && flavor !== 'None' && flavor !== 'undefined' ? flavor : null,
      baseCoffee && baseCoffee !== 'undefined' ? baseCoffee : 'Latte'
    ].filter(Boolean).join(' ').trim() || 'Custom Specialty Coffee';

    addToCart({
      name: formattedName,
      basePrice: price,
      quantity: 1,
      customization: {
        baseDrink: baseCoffee,
        size,
        milk,
        sweetness,
        temperature,
        flavor,
        addOns
      }
    });

    addToast({
      title: 'Added to Cart',
      message: `${size} ${baseCoffee} configured (₹${price})`,
      type: 'success'
    });

    onNavigate('cart');
  };

  const handleGenerateDna = () => {
    onNavigate('coffee-dna', {
      createData: {
        drinkName: `${size} ${baseCoffee}`,
        customization: {
          baseDrink: baseCoffee,
          size,
          milk,
          sweetness,
          temperature,
          flavor,
          addOns
        }
      }
    });
  };

  const previewDna = {
    strength: baseCoffee === 'Espresso' ? 95 : addOns.includes('Extra Shot') ? 85 : 68,
    sweetness: sweetness === 'No Sugar' ? 10 : sweetness === 'Less' ? 40 : sweetness === 'Extra' ? 90 : 65,
    creaminess: milk === 'Regular' ? 85 : milk === 'Oat' ? 82 : milk === 'Almond' ? 70 : 30,
    chill: temperature === 'Iced' ? 90 : temperature === 'Warm' ? 40 : 15,
    energy: addOns.includes('Extra Shot') ? 92 : baseCoffee === 'Cold Brew' ? 88 : 74
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-mono uppercase text-[#b45309] tracking-wider font-bold">
          🧋 Interactive Craft Studio
        </span>
        <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#24160f]">
          Build Your Own Coffee
        </h1>
        <p className="text-[#5c4033] text-sm">
          Customize every parameter of your brew with live visual cup reflection and dynamic pricing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Live Visual Cup & DNA Preview */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#fef6e9] border border-[#f5cb87] text-[#b45309] text-xs font-mono font-bold">
              LIVE CUP PREVIEW
            </div>

            <div className="pt-8 flex justify-center">
              <CupPreview
                customization={{
                  baseDrink: baseCoffee,
                  size,
                  milk,
                  temperature,
                  flavor,
                  addOns
                }}
              />
            </div>

            {/* Dynamic Price Display */}
            <div className="mt-6 pt-4 border-t border-[#f0e8df] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-[#785b46]">Total Calculated Price</span>
                <p className="text-3xl font-black text-[#b45309] font-mono">₹{price}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleGenerateDna}
                  className="px-3.5 py-2.5 rounded-xl border border-[#e8dfd5] bg-[#faf7f2] hover:bg-[#f4eee6] text-[#b45309] text-xs font-bold transition flex items-center gap-1.5"
                  title="Generate Coffee DNA"
                >
                  <Layers className="w-3.5 h-3.5" />
                  DNA
                </button>
                <button
                  onClick={handleAddToCart}
                  className="px-5 py-2.5 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>

          {/* Real-time DNA Metrics Bar */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#b45309] font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live Coffee DNA Radar
              </span>
              <span className="text-[10px] text-[#785b46] font-mono">
                {temperature === 'Iced' ? '❄️ The Polar Rush' : '☕ The Cozy Achiever'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-[#24160f] mb-1 font-medium">
                  <span>☕ Strength</span>
                  <span className="font-bold text-[#b45309]">{previewDna.strength}%</span>
                </div>
                <div className="w-full bg-[#eadecc] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#b45309] h-full rounded-full transition-all duration-500" style={{ width: `${previewDna.strength}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#24160f] mb-1 font-medium">
                  <span>🍯 Sweetness</span>
                  <span className="font-bold text-[#d97706]">{previewDna.sweetness}%</span>
                </div>
                <div className="w-full bg-[#eadecc] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#d97706] h-full rounded-full transition-all duration-500" style={{ width: `${previewDna.sweetness}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#24160f] mb-1 font-medium">
                  <span>🥛 Creaminess</span>
                  <span className="font-bold text-[#a16207]">{previewDna.creaminess}%</span>
                </div>
                <div className="w-full bg-[#eadecc] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#a16207] h-full rounded-full transition-all duration-500" style={{ width: `${previewDna.creaminess}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#24160f] mb-1 font-medium">
                  <span>❄️ Chill</span>
                  <span className="font-bold text-[#0284c7]">{previewDna.chill}%</span>
                </div>
                <div className="w-full bg-[#eadecc] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#0284c7] h-full rounded-full transition-all duration-500" style={{ width: `${previewDna.chill}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customization Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Base Coffee */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-3">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#b45309] font-bold">
              1. Base Coffee
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {coffeeBases.map((b) => (
                <button
                  key={b.name}
                  onClick={() => setBaseCoffee(b.name)}
                  className={`p-3 rounded-2xl border text-left transition ${
                    baseCoffee === b.name
                      ? 'border-[#b45309] bg-[#fef6e9] text-[#24160f] shadow-sm font-semibold'
                      : 'border-[#e8dfd5] bg-[#faf7f2] text-[#5c4033] hover:border-[#b45309]'
                  }`}
                >
                  <p className="text-sm font-bold">{b.name}</p>
                  <p className="text-[10px] text-[#b45309] font-mono mt-0.5">₹{b.basePrice}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Size */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-3">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#b45309] font-bold">
              2. Size Selection
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { name: 'Small', vol: '240ml', mod: 'Standard' },
                { name: 'Medium', vol: '360ml', mod: '+₹25' },
                { name: 'Large', vol: '480ml', mod: '+₹45' }
              ].map((s) => (
                <button
                  key={s.name}
                  onClick={() => setSize(s.name)}
                  className={`p-3 rounded-2xl border text-left transition ${
                    size === s.name
                      ? 'border-[#b45309] bg-[#fef6e9] text-[#24160f] shadow-sm font-semibold'
                      : 'border-[#e8dfd5] bg-[#faf7f2] text-[#5c4033] hover:border-[#b45309]'
                  }`}
                >
                  <p className="text-sm font-bold">{s.name}</p>
                  <p className="text-[10px] text-[#785b46]">{s.vol}</p>
                  <p className="text-[10px] text-[#b45309] font-mono mt-1">{s.mod}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Milk Choice */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-3">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#b45309] font-bold">
              3. Milk
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { name: 'Regular', desc: 'Whole Dairy', mod: '+₹0' },
                { name: 'Oat', desc: 'Barista Blend', mod: '+₹35' },
                { name: 'Almond', desc: 'Unsweetened', mod: '+₹35' },
                { name: 'Soy', desc: 'Organic', mod: '+₹25' }
              ].map((m) => (
                <button
                  key={m.name}
                  onClick={() => setMilk(m.name)}
                  className={`p-3 rounded-2xl border text-left transition ${
                    milk === m.name
                      ? 'border-[#b45309] bg-[#fef6e9] text-[#24160f] shadow-sm font-semibold'
                      : 'border-[#e8dfd5] bg-[#faf7f2] text-[#5c4033] hover:border-[#b45309]'
                  }`}
                >
                  <p className="text-sm font-bold">{m.name}</p>
                  <p className="text-[10px] text-[#785b46]">{m.desc}</p>
                  <p className="text-[10px] text-[#b45309] font-mono mt-1">{m.mod}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Sweetness */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-3">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#b45309] font-bold">
              4. Sweetness
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { name: 'No Sugar', pct: '0%' },
                { name: 'Less', pct: '25%' },
                { name: 'Normal', pct: '50%' },
                { name: 'Extra', pct: '100%' }
              ].map((sw) => (
                <button
                  key={sw.name}
                  onClick={() => setSweetness(sw.name)}
                  className={`p-3 rounded-2xl border text-center transition ${
                    sweetness === sw.name
                      ? 'border-[#b45309] bg-[#fef6e9] text-[#24160f] shadow-sm font-semibold'
                      : 'border-[#e8dfd5] bg-[#faf7f2] text-[#5c4033] hover:border-[#b45309]'
                  }`}
                >
                  <p className="text-sm font-bold">{sw.name}</p>
                  <p className="text-[10px] text-[#785b46]">{sw.pct}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Temperature */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-3">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#b45309] font-bold">
              5. Temperature
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { name: 'Hot', icon: Flame, desc: 'Steaming 65°C' },
                { name: 'Warm', icon: Flame, desc: 'Drinkable 55°C' },
                { name: 'Iced', icon: Snowflake, desc: 'Chilled with cubes' }
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.name}
                    onClick={() => setTemperature(t.name)}
                    className={`p-3 rounded-2xl border text-center transition ${
                      temperature === t.name
                        ? 'border-[#b45309] bg-[#fef6e9] text-[#24160f] shadow-sm font-semibold'
                        : 'border-[#e8dfd5] bg-[#faf7f2] text-[#5c4033] hover:border-[#b45309]'
                    }`}
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1 text-[#b45309]" />
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-[10px] text-[#785b46]">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Flavor */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-3">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#b45309] font-bold">
              6. Flavor
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { name: 'None', mod: 'Standard' },
                { name: 'Vanilla', mod: '+₹25' },
                { name: 'Caramel', mod: '+₹25' },
                { name: 'Hazelnut', mod: '+₹25' },
                { name: 'Chocolate', mod: '+₹30' },
                { name: 'Mocha', mod: '+₹30' }
              ].map((f) => (
                <button
                  key={f.name}
                  onClick={() => setFlavor(f.name)}
                  className={`p-3 rounded-2xl border text-left transition ${
                    flavor === f.name
                      ? 'border-[#b45309] bg-[#fef6e9] text-[#24160f] shadow-sm font-semibold'
                      : 'border-[#e8dfd5] bg-[#faf7f2] text-[#5c4033] hover:border-[#b45309]'
                  }`}
                >
                  <p className="text-sm font-bold">{f.name}</p>
                  <p className="text-[10px] text-[#b45309] font-mono mt-0.5">{f.mod}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 7. Add-ons */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-3">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#b45309] font-bold">
              7. Specialty Add-ons
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { name: 'Extra Shot', mod: '+₹40' },
                { name: 'Whipped Cream', mod: '+₹30' },
                { name: 'Caramel', mod: '+₹20' },
                { name: 'Chocolate', mod: '+₹20' },
                { name: 'Cinnamon', mod: '+₹10' }
              ].map((a) => {
                const selected = addOns.includes(a.name);
                return (
                  <button
                    key={a.name}
                    onClick={() => toggleAddOn(a.name)}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                      selected
                        ? 'border-[#b45309] bg-[#fef6e9] text-[#24160f] shadow-sm font-semibold'
                        : 'border-[#e8dfd5] bg-[#faf7f2] text-[#5c4033] hover:border-[#b45309]'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold">{a.name}</p>
                      <p className="text-[10px] text-[#b45309] font-mono mt-0.5">{a.mod}</p>
                    </div>
                    {selected && <CheckCircle className="w-4 h-4 text-[#4d6344]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Final CTA Bar */}
          <div className="bg-[#fef6e9] border border-[#f5cb87] rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase text-[#b45309] font-bold">Configuration Summary</span>
              <h3 className="text-xl font-bold text-[#24160f]">
                {[size, flavor !== 'None' ? flavor : null, baseCoffee].filter(Boolean).join(' ')}
              </h3>
              <p className="text-xs text-[#5c4033] mt-0.5">
                {milk} Milk • {sweetness} Sweet • {temperature}
                {addOns.length > 0 && ` • +${addOns.join(', ')}`}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-2xl font-black text-[#b45309] font-mono sm:text-right">
                ₹{price}
              </span>
              <button
                onClick={handleAddToCart}
                className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-[#b45309] hover:bg-[#92400e] text-white text-sm font-bold transition shadow-sm flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                Add to Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
