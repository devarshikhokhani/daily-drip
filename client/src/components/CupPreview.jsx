import React from 'react';
import { Sparkles } from 'lucide-react';

export default function CupPreview({ customization = {}, cupDesign = null, className = '' }) {
  const {
    baseDrink = 'Latte',
    size = 'Medium',
    milk = 'Regular Dairy Milk',
    temperature = 'Hot',
    flavor = 'Pure Coffee',
    addOns = []
  } = customization;

  const isIced = (temperature || '').toLowerCase().includes('iced') || (temperature || '').toLowerCase().includes('cold');
  const isMatcha = (baseDrink || '').toLowerCase().includes('matcha');
  const isEspresso = (baseDrink || '').toLowerCase().includes('espresso') || (baseDrink || '').toLowerCase().includes('ristretto');
  const isMocha = (baseDrink || '').toLowerCase().includes('mocha');

  // Cup liquid colors
  let liquidColor = '#593822'; // Default rich coffee
  if (isMatcha) liquidColor = '#2d5a27'; // Matcha green
  else if (isEspresso) liquidColor = '#211208'; // Dark espresso
  else if (isMocha) liquidColor = '#3a1f18'; // Chocolate mocha
  else if (milk && (milk.includes('Oat') || milk.includes('Dairy') || milk.includes('Almond'))) {
    liquidColor = '#8a5c38'; // Milky latte
  }

  const hasWhippedCream = Array.isArray(addOns) && addOns.some(a => a.toLowerCase().includes('whipped') || a.toLowerCase().includes('cream'));

  return (
    <div className={`relative flex flex-col items-center justify-center p-6 ${className}`}>
      {/* Animated steam (only for hot/warm) */}
      {!isIced && (
        <div className="absolute -top-6 flex justify-center gap-2 pointer-events-none">
          <span className="w-1.5 h-6 bg-amber-100/70 rounded-full steam-anim-1"></span>
          <span className="w-2 h-8 bg-amber-200/80 rounded-full steam-anim-2"></span>
          <span className="w-1.5 h-5 bg-amber-100/60 rounded-full steam-anim-3"></span>
        </div>
      )}

      {/* Coffee Cup Container */}
      <div className="relative w-40 sm:w-48 transition-all duration-300">
        {/* Cup Lid (for Hot) or Rim */}
        <div className="w-full h-4 bg-stone-300 rounded-t-md shadow-md border-b border-stone-400 relative z-20 flex items-center justify-center">
          <div className="w-12 h-1.5 bg-stone-400/80 rounded-full"></div>
          {isIced && (
            /* Clear plastic dome / straw */
            <div className="absolute -top-8 w-5 h-10 bg-amber-400/80 rounded-full transform rotate-12 -right-1 border border-amber-600/50"></div>
          )}
        </div>

        {/* Cup Body */}
        <div
          className="relative w-full h-52 sm:h-60 rounded-b-[2rem] overflow-hidden shadow-2xl border-x-2 border-b-2 border-stone-700/40 flex flex-col justify-end transition-all"
          style={{
            background: 'linear-gradient(180deg, #2b1d16 0%, #1a110c 100%)'
          }}
        >
          {/* Glass / Liquid level */}
          <div
            className="w-full transition-all duration-500 relative overflow-hidden"
            style={{
              height: size.includes('Large') ? '88%' : size.includes('Small') ? '70%' : '80%',
              backgroundColor: liquidColor
            }}
          >
            {/* Liquid wave surface */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-amber-100/40 rounded-full blur-[1px]"></div>

            {/* Ice Cubes (for Iced drinks) */}
            {isIced && (
              <div className="absolute inset-0 p-4 pointer-events-none">
                <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/40 transform rotate-12 absolute top-4 left-4 animate-float shadow-inner"></div>
                <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/40 transform -rotate-45 absolute top-10 right-6 animate-float shadow-inner" style={{ animationDelay: '1.2s' }}></div>
                <div className="w-6 h-6 rounded-lg bg-white/20 border border-white/40 transform rotate-6 absolute top-24 left-10 animate-float shadow-inner" style={{ animationDelay: '0.6s' }}></div>
              </div>
            )}

            {/* Whipped Cream Top */}
            {hasWhippedCream && (
              <div className="absolute top-0 left-0 right-0 h-8 bg-amber-50/90 rounded-b-xl flex items-center justify-center shadow-md">
                <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                  Whipped Crema
                </span>
              </div>
            )}
          </div>

          {/* Cup Sleeve / Brand Wrap */}
          <div className="absolute top-16 left-0 right-0 h-28 bg-[#3d2719] border-y border-[#5e3d29] shadow-lg flex flex-col items-center justify-center p-2 z-10">
            {cupDesign ? (
              <img
                src={cupDesign}
                alt="Your Custom Cup Art"
                className="w-full h-full object-contain rounded-md"
              />
            ) : (
              <div className="text-center">
                <p className="font-display font-black text-xs tracking-wider text-amber-400">
                  DAILY DRIP
                </p>
                <p className="text-[9px] text-stone-300 font-mono">
                  {baseDrink}
                </p>
                <div className="mt-1 flex items-center justify-center gap-1 text-[8px] text-amber-300/80 bg-[#25170e] px-2 py-0.5 rounded-full border border-amber-900/50">
                  <span>{size}</span> • <span>{temperature}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cup Shadow */}
        <div className="w-32 sm:w-36 h-3 bg-black/60 rounded-full mx-auto blur-md mt-2"></div>
      </div>

      {/* Live Badge info */}
      <div className="mt-4 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#2a1c14] border border-amber-600/30 text-amber-400">
          <Sparkles className="w-3 h-3 text-amber-500" />
          {baseDrink} • {isIced ? '🧊 Iced' : '☕ Hot'}
        </span>
      </div>
    </div>
  );
}
