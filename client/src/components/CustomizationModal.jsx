import React, { useState, useEffect } from 'react';
import { X, Check, Plus, ShoppingBag, Sparkles, Flame, Snowflake } from 'lucide-react';
import { useCart } from '../context/CartContext';
import CupPreview from './CupPreview';

export default function CustomizationModal({ item, isOpen, onClose, onSaveDna }) {
  const { addToCart } = useCart();

  const [size, setSize] = useState('Medium (360ml)');
  const [milk, setMilk] = useState('Regular Dairy Milk');
  const [sweetness, setSweetness] = useState('Normal (50%)');
  const [temperature, setTemperature] = useState('Hot');
  const [flavor, setFlavor] = useState('Pure Coffee (No Flavor)');
  const [addOns, setAddOns] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [calculatedPrice, setCalculatedPrice] = useState(item?.base_price || 185);

  useEffect(() => {
    if (!item) return;

    let price = item.base_price || 0;
    if (size.includes('Medium')) price += 30;
    if (size.includes('Large')) price += 60;
    if (milk.includes('Oat') || milk.includes('Almond')) price += 35;
    if (milk.includes('Soy')) price += 25;
    if (flavor && !flavor.includes('Pure')) {
      if (flavor.includes('Chocolate') || flavor.includes('Mocha')) price += 30;
      else price += 25;
    }

    for (const a of addOns) {
      if (a.includes('Extra')) price += 40;
      else if (a.includes('Whipped')) price += 30;
      else if (a.includes('Caramel') || a.includes('Chocolate')) price += 20;
      else if (a.includes('Cinnamon')) price += 10;
    }

    setCalculatedPrice(price);
  }, [item, size, milk, sweetness, temperature, flavor, addOns]);

  if (!isOpen || !item) return null;

  const toggleAddOn = (name) => {
    setAddOns(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const handleAddToCart = () => {
    addToCart({
      menuItemId: item.id,
      name: item.name,
      basePrice: calculatedPrice,
      quantity,
      customization: {
        baseDrink: item.name,
        size,
        milk,
        sweetness,
        temperature,
        flavor,
        addOns
      }
    });
    onClose();
  };

  const handleSaveToDna = () => {
    if (onSaveDna) {
      onSaveDna({
        drinkName: item.name,
        customization: {
          baseDrink: item.name,
          size,
          milk,
          sweetness,
          temperature,
          flavor,
          addOns
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#e8dfd5] rounded-3xl max-w-4xl w-full p-5 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 rounded-full bg-[#faf7f2] border border-[#e8dfd5] z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Visual Cup Preview */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[#faf7f2] p-6 rounded-2xl border border-[#e8dfd5]">
            <CupPreview
              customization={{
                baseDrink: item.name,
                size,
                milk,
                temperature,
                flavor,
                addOns
              }}
            />

            <div className="mt-4 text-center">
              <h3 className="text-lg font-bold text-[#24160f]">{item.name}</h3>
              <p className="text-xs text-stone-500 mt-1 line-clamp-2">{item.description}</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-xs text-stone-400">Total Price:</span>
                <span className="text-2xl font-black text-amber-400 font-mono">
                  ₹{calculatedPrice * quantity}
                </span>
                {quantity > 1 && (
                  <span className="text-xs text-stone-500">(₹{calculatedPrice} each)</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Customization Controls */}
          <div className="lg:col-span-7 space-y-5 max-h-[75vh] overflow-y-auto pr-2">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-amber-500 font-bold">
                Personalize Your Drink
              </span>
              <h2 className="text-2xl font-display font-extrabold text-[#24160f]">
                Customize Recipe
              </h2>
            </div>

            {/* Size Options */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'Small (240ml)', price: 'Base' },
                  { name: 'Medium (360ml)', price: '+₹30' },
                  { name: 'Large (480ml)', price: '+₹60' }
                ].map((s) => (
                  <button
                    key={s.name}
                    onClick={() => setSize(s.name)}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium text-left transition ${
                      size === s.name
                        ? 'border-amber-500 bg-amber-500/20 text-[#24160f] font-bold'
                        : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-600 hover:border-amber-400'
                    }`}
                  >
                    <div>{s.name.split(' ')[0]}</div>
                    <div className="text-[10px] text-amber-400 mt-0.5">{s.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Milk Options */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                Milk Choice
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { name: 'Regular Dairy Milk', label: 'Dairy', price: '+₹0' },
                  { name: 'Oat Milk (Barista Blend)', label: 'Oat Milk', price: '+₹35' },
                  { name: 'Almond Milk (Unsweetened)', label: 'Almond', price: '+₹35' },
                  { name: 'Soy Milk (Organic)', label: 'Soy Milk', price: '+₹25' }
                ].map((m) => (
                  <button
                    key={m.name}
                    onClick={() => setMilk(m.name)}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium text-left transition ${
                      milk === m.name
                        ? 'border-amber-500 bg-amber-500/20 text-[#24160f] font-bold'
                        : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-600 hover:border-amber-400'
                    }`}
                  >
                    <div>{m.label}</div>
                    <div className="text-[10px] text-amber-400 mt-0.5">{m.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sweetness */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                Sweetness Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['No Sugar', 'Less (25%)', 'Normal (50%)', 'Extra (100%)'].map((sw) => (
                  <button
                    key={sw}
                    onClick={() => setSweetness(sw)}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium text-center transition ${
                      sweetness === sw
                        ? 'border-amber-500 bg-amber-500/20 text-[#24160f] font-bold'
                        : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-600 hover:border-amber-400'
                    }`}
                  >
                    {sw}
                  </button>
                ))}
              </div>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                Temperature
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'Hot', icon: Flame },
                  { name: 'Warm', icon: Flame },
                  { name: 'Iced', icon: Snowflake }
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.name}
                      onClick={() => setTemperature(t.name)}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                        temperature === t.name
                          ? 'border-amber-500 bg-amber-500/20 text-[#24160f] font-bold'
                          : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-600 hover:border-amber-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flavors */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                Flavor Infusion
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: 'Pure Coffee (No Flavor)', price: 'Standard' },
                  { name: 'Madagascar Vanilla', price: '+₹25' },
                  { name: 'Artisan Salted Caramel', price: '+₹25' },
                  { name: 'Roasted Hazelnut', price: '+₹25' },
                  { name: 'Dark Chocolate Ganache', price: '+₹30' },
                  { name: 'Swiss Mocha', price: '+₹30' }
                ].map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setFlavor(f.name)}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium text-left transition ${
                      flavor === f.name
                        ? 'border-amber-500 bg-amber-500/20 text-[#24160f] font-bold'
                        : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-600 hover:border-amber-400'
                    }`}
                  >
                    <div className="truncate">{f.name.split(' ')[0]}</div>
                    <div className="text-[10px] text-amber-400 mt-0.5">{f.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Add-ons */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                Specialty Add-ons
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Extra Espresso Shot', price: '+₹40' },
                  { name: 'Fresh Whipped Cream', price: '+₹30' },
                  { name: 'Artisan Caramel Drizzle', price: '+₹20' },
                  { name: 'Dark Chocolate Curls', price: '+₹20' },
                  { name: 'Ceylon Cinnamon Dust', price: '+₹10' }
                ].map((add) => {
                  const selected = addOns.includes(add.name);
                  return (
                    <button
                      key={add.name}
                      onClick={() => toggleAddOn(add.name)}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition ${
                        selected
                          ? 'border-amber-500 bg-amber-500/20 text-[#24160f] font-bold'
                          : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-600 hover:border-amber-400'
                      }`}
                    >
                      <div className="truncate">{add.name}</div>
                      <div className="text-[10px] text-amber-400 ml-2">{add.price}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity and Actions */}
            <div className="pt-4 border-t border-[#e8dfd5] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-2 py-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-[#24160f] font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-bold text-[#24160f]">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-[#24160f] font-bold"
                >
                  +
                </button>
              </div>

              <div className="flex items-center gap-2 flex-1 justify-end">
                <button
                  onClick={handleSaveToDna}
                  className="px-4 py-2.5 rounded-xl border border-amber-600/40 text-amber-400 hover:bg-amber-600/10 text-xs font-bold transition flex items-center gap-1.5"
                  title="Generate Coffee DNA"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  DNA Card
                </button>
                <button
                  onClick={handleAddToCart}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg"
                >
                  <ShoppingBag className="w-4 h-4" />
                  ADD TO CART (₹{calculatedPrice * quantity})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
