import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Sparkles,
  Flame,
  Radio,
  Compass,
  ArrowRight,
  Layers,
  Clock,
  ShieldCheck,
  CheckCircle,
  Plus,
  RefreshCw,
  Zap,
  Mic
} from 'lucide-react';
import RushMeter from '../components/RushMeter';
import CupPreview from '../components/CupPreview';
import CustomizationModal from '../components/CustomizationModal';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Home({ onNavigate, onOpenVoiceOrder }) {
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [featuredDrinks, setFeaturedDrinks] = useState([]);
  const [usualOrder, setUsualOrder] = useState(null);
  const [selectedItemForCustom, setSelectedItemForCustom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/menu/featured')
      .then(res => res.json())
      .then(data => setFeaturedDrinks(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    if (isAuthenticated) {
      const token = localStorage.getItem('dd_token');
      fetch('/api/orders/user/usual', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.usual) setUsualOrder(data.usual);
        })
        .catch(err => console.error(err));
    }
  }, [isAuthenticated]);

  const handleReorderUsual = () => {
    if (!usualOrder || !usualOrder.items) return;
    for (const item of usualOrder.items) {
      addToCart({
        menuItemId: item.menu_item_id,
        name: item.name,
        basePrice: item.base_price,
        quantity: item.quantity,
        customization: item.customization
      });
    }
    onNavigate('cart');
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & Actions */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f4eee6] border border-[#e8dfd5] text-[#b45309] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#b45309]" />
                <span>Next-Gen Smart Café & Specialty Roastery</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tight text-[#24160f] leading-[1.08]">
                DAILY DRIP
                <span className="block text-[#b45309] font-serif italic font-normal text-3xl sm:text-5xl mt-2">
                  Your Coffee. Your Way.
                </span>
              </h1>

              <p className="text-[#5c4033] text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
                Step into a connected café world. Precision-extracted single origin beans, personalized Coffee DNA, real-time cross-device ordering, touch cup art, and live kitchen synchronization.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
                <button
                  onClick={() => onNavigate('menu')}
                  className="px-6 py-3.5 rounded-2xl bg-[#b45309] hover:bg-[#92400e] text-white font-bold text-sm shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                  <Coffee className="w-4 h-4" />
                  Explore Menu
                </button>

                <button
                  onClick={() => onNavigate('build-coffee')}
                  className="px-6 py-3.5 rounded-2xl bg-[#f4eee6] hover:bg-[#eadecc] text-[#24160f] font-bold text-sm border border-[#e8dfd5] transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                  <Flame className="w-4 h-4 text-[#c2410c]" />
                  Build Your Coffee
                </button>

                <button
                  onClick={() => onNavigate('cafe')}
                  className="px-6 py-3.5 rounded-2xl bg-[#fef6e9] hover:bg-[#fdeece] text-[#b45309] font-bold text-sm border border-[#f5cb87] transition flex items-center gap-2"
                >
                  <Radio className="w-4 h-4 text-[#b45309] animate-pulse" />
                  Enter Café Portal
                </button>

                <button
                  onClick={() => onNavigate('delivery')}
                  className="px-6 py-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-sm border border-blue-200 transition flex items-center gap-2"
                >
                  <span>🛵</span>
                  Order Delivery
                </button>

                <button
                  onClick={onOpenVoiceOrder}
                  className="px-4 py-3.5 rounded-2xl bg-[#faf7f2] hover:bg-[#f4eee6] text-[#5c4033] font-semibold text-sm border border-[#e8dfd5] transition flex items-center gap-2"
                  title="Voice Ordering"
                >
                  <Mic className="w-4 h-4 text-[#b45309]" />
                  Voice
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#785b46]">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#4d6344]" />
                  <span>Real Persistent SQLite</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#4d6344]" />
                  <span>Live Socket.IO Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#4d6344]" />
                  <span>Real Scannable QR</span>
                </div>
              </div>
            </div>

            {/* Right Column: Animated Coffee Visual */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-sm">
                <div className="relative rounded-3xl bg-white p-8 border border-[#e8dfd5] shadow-lg">
                  <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-[#b45309] text-white font-extrabold text-[11px] tracking-wider uppercase shadow-sm">
                    Signature Brew of the Day
                  </div>

                  <CupPreview
                    customization={{
                      baseDrink: 'Madagascar Vanilla Bean Latte',
                      size: 'Large (480ml)',
                      milk: 'Oat Milk (Barista Blend)',
                      temperature: 'Hot',
                      flavor: 'Madagascar Vanilla',
                      addOns: ['Extra Espresso Shot', 'Ceylon Cinnamon Dust']
                    }}
                  />

                  <div className="mt-4 pt-4 border-t border-[#f0e8df] text-center space-y-1">
                    <h3 className="font-bold text-[#24160f] text-base">
                      Madagascar Vanilla Bean Latte
                    </h3>
                    <p className="text-xs text-[#5c4033]">
                      Double Ristretto • Velvet Microfoam • Real Bourbon Vanilla
                    </p>
                    <div className="pt-3 flex items-center justify-between">
                      <span className="text-lg font-black text-[#b45309] font-mono">₹245</span>
                      <button
                        onClick={() => onNavigate('build-coffee')}
                        className="px-4 py-1.5 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white font-bold text-xs transition shadow-sm"
                      >
                        Customize & Craft
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Café Rush Meter section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RushMeter variant="banner" />
      </section>

      {/* Café Remembers You */}
      {isAuthenticated && usualOrder && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-5 bg-[#fef6e9] border border-[#f5cb87] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#f5cb87] flex items-center justify-center text-[#b45309] text-xl font-bold shadow-sm">
                ☕
              </div>
              <div>
                <span className="text-[11px] font-mono text-[#b45309] uppercase tracking-wider font-semibold">
                  Welcome Back, {user?.name}! 👋
                </span>
                <h3 className="text-lg font-bold text-[#24160f]">Your usual?</h3>
                <p className="text-xs text-[#5c4033]">
                  {usualOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')} • ₹{usualOrder.totalAmount}
                </p>
              </div>
            </div>

            <button
              onClick={handleReorderUsual}
              className="px-6 py-2.5 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white font-bold text-xs shadow-sm transition flex items-center gap-2 shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              ORDER AGAIN
            </button>
          </div>
        </section>
      )}

      {/* Featured Specialty Coffee Drinks */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-[#b45309] tracking-wider font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Specialty Roastery Collection
            </div>
            <h2 className="text-3xl font-display font-extrabold text-[#24160f]">
              Featured Coffee & Brews
            </h2>
          </div>
          <button
            onClick={() => onNavigate('menu')}
            className="text-[#b45309] hover:text-[#92400e] font-semibold text-sm flex items-center gap-1.5 transition"
          >
            <span>Explore all categories</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Featured Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredDrinks.map((drink) => (
            <div
              key={drink.id}
              className="bg-white border border-[#e8dfd5] rounded-3xl overflow-hidden hover:border-[#b45309] transition group flex flex-col justify-between shadow-sm hover:shadow-md"
            >
              <div>
                <div className="relative h-48 overflow-hidden bg-[#faf7f2]">
                  <img
                    src={drink.image_url}
                    alt={drink.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {drink.origin_flag && (
                      <span className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs font-bold text-white border border-white/10">
                        {drink.origin_flag} {drink.origin_country}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="px-3 py-1 rounded-full bg-[#b45309] text-white font-bold text-sm shadow-sm font-mono">
                      ₹{drink.base_price}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className="text-lg font-bold text-[#24160f] group-hover:text-[#b45309] transition">
                    {drink.name}
                  </h3>
                  <p className="text-xs text-[#5c4033] line-clamp-2 leading-relaxed">
                    {drink.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {(drink.tags || []).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#faf7f2] text-[#5c4033] border border-[#e8dfd5]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-[#f0e8df] mt-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedItemForCustom(drink)}
                  className="flex-1 py-2.5 rounded-xl bg-[#faf7f2] hover:bg-[#f4eee6] text-[#24160f] text-xs font-bold border border-[#e8dfd5] transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#b45309]" />
                  Customize
                </button>
                <button
                  onClick={() => {
                    addToCart({
                      menuItemId: drink.id,
                      name: drink.name,
                      basePrice: drink.base_price,
                      quantity: 1,
                      customization: { size: 'Medium (360ml)' }
                    });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Smart Café Technology Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-[#b45309] tracking-wider font-bold">
            <Zap className="w-3.5 h-3.5" />
            Connected Smart Ecosystem
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-[#24160f]">
            Technology Meets Specialty Coffee
          </h2>
          <p className="text-[#5c4033] text-sm">
            Not just another coffee shop menu. Experience an integrated digital café ecosystem engineered for seamless personalization and live bar coordination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            onClick={() => onNavigate('build-coffee')}
            className="p-6 rounded-3xl bg-white border border-[#e8dfd5] hover:border-[#b45309] transition cursor-pointer group shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#fef6e9] border border-[#f5cb87] flex items-center justify-center text-[#c2410c] mb-4 group-hover:scale-110 transition">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#24160f] mb-2">Build Your Own Coffee</h3>
            <p className="text-xs text-[#5c4033] leading-relaxed">
              Fine-tune base roast, exact size, plant-based milks, sweetness percentages, temperature, and syrups with live dynamic pricing.
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-[#b45309] font-semibold mt-4 group-hover:translate-x-1 transition">
              Launch Builder <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={() => onNavigate('coffee-dna')}
            className="p-6 rounded-3xl bg-white border border-[#e8dfd5] hover:border-[#b45309] transition cursor-pointer group shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#faf7f2] border border-[#e8dfd5] flex items-center justify-center text-[#b45309] mb-4 group-hover:scale-110 transition">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#24160f] mb-2">Coffee DNA & Real QR</h3>
            <p className="text-xs text-[#5c4033] leading-relaxed">
              Every customized recipe receives a unique Coffee DNA with radar metrics. Generate a real scannable QR code to share across devices.
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-[#b45309] font-semibold mt-4 group-hover:translate-x-1 transition">
              Explore DNA <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={() => onNavigate('cafe')}
            className="p-6 rounded-3xl bg-white border-2 border-[#b45309]/30 hover:border-[#b45309] transition cursor-pointer group shadow-sm hover:shadow-md relative overflow-hidden"
          >
            <div className="absolute top-3 right-3 text-[10px] font-mono font-bold bg-[#fef6e9] text-[#b45309] px-2 py-0.5 rounded-full border border-[#f5cb87]">
              CORE FEATURE
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#fef6e9] border border-[#f5cb87] flex items-center justify-center text-[#b45309] mb-4 group-hover:scale-110 transition">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-[#24160f] mb-2">Café Portal (Cross-Device)</h3>
            <p className="text-xs text-[#5c4033] leading-relaxed">
              One website, two devices. Connect your phone to the café screen with a 4-digit code. Two-way live slider synchronization & touch cup drawing!
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-[#b45309] font-semibold mt-4 group-hover:translate-x-1 transition">
              Open Café Portal <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={() => onNavigate('orders')}
            className="p-6 rounded-3xl bg-white border border-[#e8dfd5] hover:border-[#b45309] transition cursor-pointer group shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#faf7f2] border border-[#e8dfd5] flex items-center justify-center text-[#b45309] mb-4 group-hover:scale-110 transition">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#24160f] mb-2">Smart Queue & Rush Meter</h3>
            <p className="text-xs text-[#5c4033] leading-relaxed">
              Real-time calculation of active orders before you. Intelligent workload estimation and live status transitions across all screens.
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-[#b45309] font-semibold mt-4 group-hover:translate-x-1 transition">
              View Queue <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={() => onNavigate('passport')}
            className="p-6 rounded-3xl bg-white border border-[#e8dfd5] hover:border-[#b45309] transition cursor-pointer group shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#faf7f2] border border-[#e8dfd5] flex items-center justify-center text-[#4d6344] mb-4 group-hover:scale-110 transition">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#24160f] mb-2">Digital Coffee Passport</h3>
            <p className="text-xs text-[#5c4033] leading-relaxed">
              Track discovered international drinks from Italy, France, USA, Japan, and India. Automatically unlocked as you place orders.
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-[#b45309] font-semibold mt-4 group-hover:translate-x-1 transition">
              Open Passport <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={onOpenVoiceOrder}
            className="p-6 rounded-3xl bg-white border border-[#e8dfd5] hover:border-[#b45309] transition cursor-pointer group shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#faf7f2] border border-[#e8dfd5] flex items-center justify-center text-[#b45309] mb-4 group-hover:scale-110 transition">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#24160f] mb-2">Voice Café Ordering</h3>
            <p className="text-xs text-[#5c4033] leading-relaxed">
              Speak naturally using browser speech recognition. Describe what you're craving, and our smart engine matches and adds it instantly.
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-[#b45309] font-semibold mt-4 group-hover:translate-x-1 transition">
              Try Voice Assistant <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </section>

      {/* Live Classroom Demonstration Instructions Box */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-6 sm:p-8 bg-white border border-[#e8dfd5] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-[#fef6e9] text-[#b45309] border border-[#f5cb87] font-bold text-xs uppercase font-mono">
              Live Demo Guide
            </span>
            <h3 className="text-xl font-bold text-[#24160f]">
              Demonstrating the 2-Device Live Café World
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#5c4033] leading-relaxed">
            To showcase the full cross-device workflow in a classroom or presentation:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e8dfd5]">
              <span className="text-[#b45309] font-bold text-xs font-mono">STEP 1 • LAPTOP</span>
              <h4 className="text-sm font-bold text-[#24160f] mt-1">Open Café Portal / Staff KDS</h4>
              <p className="text-xs text-[#5c4033] mt-1">
                Click <strong>Café Portal</strong> to host the shared session (e.g. Code <strong>4827</strong>) or open <strong>Staff KDS</strong>.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e8dfd5]">
              <span className="text-[#b45309] font-bold text-xs font-mono">STEP 2 • PHONE / 2ND TAB</span>
              <h4 className="text-sm font-bold text-[#24160f] mt-1">Connect with 4-Digit Code</h4>
              <p className="text-xs text-[#5c4033] mt-1">
                Scan the QR or enter <strong>4827</strong>. Slide sweetness or draw on the cup. Watch the laptop update simultaneously!
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e8dfd5]">
              <span className="text-[#b45309] font-bold text-xs font-mono">STEP 3 • LIVE LOOP</span>
              <h4 className="text-sm font-bold text-[#24160f] mt-1">Send, Prepare & Celebrate</h4>
              <p className="text-xs text-[#5c4033] mt-1">
                Tap <strong>SEND TO CAFÉ</strong> on phone. On laptop click <strong>PREPARING</strong> then <strong>READY</strong>. Watch phone celebrate with confetti!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customization Modal */}
      {selectedItemForCustom && (
        <CustomizationModal
          item={selectedItemForCustom}
          isOpen={!!selectedItemForCustom}
          onClose={() => setSelectedItemForCustom(null)}
          onSaveDna={(dnaData) => {
            setSelectedItemForCustom(null);
            onNavigate('coffee-dna', { createData: dnaData });
          }}
        />
      )}
    </div>
  );
}
