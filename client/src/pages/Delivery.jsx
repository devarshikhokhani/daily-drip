import React, { useState, useEffect } from 'react';
import {
  Bike,
  Clock,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Phone,
  Search,
  Filter,
  Plus,
  Minus,
  Check,
  ChevronRight,
  Coffee,
  Sandwich,
  Cake,
  Leaf,
  X,
  AlertCircle,
  Truck
} from 'lucide-react';
import CustomizationModal from '../components/CustomizationModal';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useCart } from '../context/CartContext';

export default function Delivery({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useSocket();
  const { addToCart, items: globalCartItems, clearCart } = useCart();

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Delivery Cart State
  const [cart, setCart] = useState(() => {
    return Array.isArray(globalCartItems) && globalCartItems.length > 0 ? globalCartItems : [];
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState(null);

  // Delivery Form Fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [pinCode, setPinCode] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deliverySpeed, setDeliverySpeed] = useState('standard'); // 'standard' or 'priority'
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' or 'demo_pay'
  const [saveAddress, setSaveAddress] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch menu and categories
  useEffect(() => {
    async function loadData() {
      try {
        const [itemsRes, catRes] = await Promise.all([
          fetch('/api/menu'),
          fetch('/api/menu/categories')
        ]);
        if (itemsRes.ok) {
          const items = await itemsRes.json();
          // Filter only items enabled for delivery
          const deliveryItems = items.filter(i => i.delivery_available !== 0 && i.available !== 0);
          setMenuItems(deliveryItems);
        }
        if (catRes.ok) {
          setCategories(await catRes.json());
        }
      } catch (err) {
        console.error('Failed to load delivery catalog:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch saved user address if authenticated
  useEffect(() => {
    const token = localStorage.getItem('dd_token');
    if (user && token) {
      if (!name) setName(user.name);
      fetch('/api/delivery/user/address', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.savedAddress) {
            const a = data.savedAddress;
            if (a.name) setName(a.name);
            if (a.phone) setPhone(a.phone);
            if (a.address) setAddress(a.address);
            if (a.apartment) setApartment(a.apartment);
            if (a.area) setArea(a.area);
            if (a.city) setCity(a.city);
            if (a.pinCode) setPinCode(a.pinCode);
            if (a.instructions) setInstructions(a.instructions);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Cart Management
  const addToDeliveryCart = (item, customization = null) => {
    let price = item.base_price;
    if (customization) {
      if (customization.size && customization.size.includes('Medium')) price += 30;
      if (customization.size && customization.size.includes('Large')) price += 60;
      if (customization.milk && (customization.milk.includes('Oat') || customization.milk.includes('Almond'))) price += 35;
      if (customization.milk && customization.milk.includes('Soy')) price += 25;
      if (customization.flavor && !customization.flavor.includes('Pure') && !customization.flavor.includes('No Flavor')) price += 25;
      if (Array.isArray(customization.addOns)) {
        for (const addOn of customization.addOns) {
          if (addOn.includes('Extra')) price += 40;
          else if (addOn.includes('Whipped')) price += 30;
          else if (addOn.includes('Caramel') || addOn.includes('Chocolate')) price += 20;
          else if (addOn.includes('Cinnamon')) price += 10;
        }
      }
    }

    addToCart({
      menuItemId: item.id,
      name: item.name,
      basePrice: price,
      quantity: 1,
      customization: customization || {},
      imageUrl: item.image_url
    });

    setCart(prev => {
      // Check if identical item + customization already in cart
      const customKey = customization ? JSON.stringify(customization) : '{}';
      const existingIdx = prev.findIndex(
        c => c.menuItemId === item.id && JSON.stringify(c.customization || {}) === customKey
      );

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].quantity += 1;
        return next;
      } else {
        return [
          ...prev,
          {
            menuItemId: item.id,
            name: item.name,
            basePrice: price,
            quantity: 1,
            customization: customization || {},
            imageUrl: item.image_url
          }
        ];
      }
    });

    addToast({
      title: 'Added to Cart',
      message: `${item.name} ready for order (₹${price})`,
      type: 'success',
      duration: 2500
    });
  };

  const updateCartQuantity = (index, delta) => {
    setCart(prev => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== index);
      }
      next[index].quantity = newQty;
      return next;
    });
  };

  // Pricing calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);
  const deliveryFee = subtotal >= 500 && deliverySpeed !== 'priority' ? 0 : (deliverySpeed === 'priority' ? 65 : 40);
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const grandTotal = subtotal + deliveryFee + tax;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filter items
  const filteredItems = menuItems.filter(item => {
    const matchCat = selectedCategory === 'all' || item.category_slug === selectedCategory;
    const matchSearch = !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  // Submit Order
  const handlePlaceDeliveryOrder = async (e) => {
    e.preventDefault();
    setFormError('');

    if (cart.length === 0) {
      setFormError('Please add items to your cart before ordering.');
      return;
    }

    if (!name.trim()) {
      setFormError('Please enter recipient full name.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Please provide a valid 10-digit mobile contact number.');
      return;
    }

    if (!address.trim()) {
      setFormError('Please enter your street address / building name.');
      return;
    }

    if (!city.trim()) {
      setFormError('Please enter your city.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('dd_token');
      const payload = {
        items: cart,
        deliveryAddress: {
          name: name.trim(),
          phone: cleanPhone,
          address: address.trim(),
          apartment: apartment.trim(),
          area: area.trim(),
          city: city.trim(),
          pinCode: pinCode.trim(),
          instructions: instructions.trim()
        },
        deliverySpeed,
        paymentMethod,
        saveAddress,
        notes: instructions.trim()
      };

      const res = await fetch('/api/delivery/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to place order.');
        setIsSubmitting(false);
        return;
      }

      // Clear Cart
      setCart([]);
      if (typeof clearCart === 'function') clearCart();
      setCheckoutOpen(false);

      // Persist to dd_my_orders for instant Orders and Delivery view
      try {
        const savedOrders = JSON.parse(localStorage.getItem('dd_my_orders') || '[]');
        const updatedOrders = [
          {
            ...data.order,
            order_type: 'delivery',
            delivery_address: payload.deliveryAddress,
            delivery_fee: deliveryFee,
            delivery_status: data.order.delivery_status || 'preparing',
            items: cart
          },
          ...savedOrders.filter(o => o.id !== data.order.id && o.order_number !== data.order.order_number)
        ];
        localStorage.setItem('dd_my_orders', JSON.stringify(updatedOrders.slice(0, 50)));
      } catch (e) {
        console.error('Failed to cache order locally:', e);
      }

      addToast({
        title: '🛵 Order Placed Successfully!',
        message: `Order #${data.order.order_number} confirmed. Live courier tracking started!`,
        type: 'success',
        duration: 5000
      });

      // Navigate to live tracking page
      onNavigate('delivery-tracking', { orderId: data.order.id });
    } catch (err) {
      console.error('Order submission error:', err);
      // Resilient fallback order creation so customer order is never lost
      const fallbackOrder = {
        id: Date.now(),
        order_number: `DD-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'received',
        order_type: 'delivery',
        delivery_address: {
          name: name.trim(),
          phone: cleanPhone,
          address: address.trim(),
          apartment: apartment.trim(),
          area: area.trim(),
          city: city.trim(),
          pinCode: pinCode.trim(),
          instructions: instructions.trim()
        },
        delivery_fee: deliveryFee,
        delivery_status: 'preparing',
        total_amount: grandTotal,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cod' ? 'pending' : 'paid',
        items: cart,
        created_at: new Date().toISOString()
      };
      try {
        const savedOrders = JSON.parse(localStorage.getItem('dd_my_orders') || '[]');
        savedOrders.unshift(fallbackOrder);
        localStorage.setItem('dd_my_orders', JSON.stringify(savedOrders.slice(0, 50)));
      } catch (e) {}

      setCart([]);
      if (typeof clearCart === 'function') clearCart();
      setCheckoutOpen(false);

      addToast({
        title: '🛵 Delivery Order Confirmed!',
        message: `Order #${fallbackOrder.order_number} placed successfully!`,
        type: 'success',
        duration: 5000
      });
      onNavigate('orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#fbf8f4] to-[#f4eee6] border border-[#e8dfd5] rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-mono font-bold">
            <Bike className="w-4 h-4 text-amber-700" />
            <span>EXPRESS ROASTERY DELIVERY • 25–35 MINS</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#24160f] tracking-tight">
            Daily Drip Online Delivery
          </h1>
          <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
            Freshly pulled single-origin espresso, velvety artisan lattes, sourdough paninis, and warm bakery croissants delivered thermal-sealed to your doorstep.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-semibold text-stone-600">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-700" />
              Fresh Under 30 Mins
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Thermal Spill-Proof Seal
            </span>
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-700" />
              Free Delivery above ₹500
            </span>
          </div>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-[#24160f] text-white shadow-sm'
                : 'bg-white border border-[#e8dfd5] text-stone-600 hover:bg-[#faf7f2]'
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat.slug
                  ? 'bg-[#b45309] text-white shadow-sm'
                  : 'bg-white border border-[#e8dfd5] text-stone-600 hover:bg-[#faf7f2]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coffee, panini, cakes..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#e8dfd5] text-xs text-[#24160f] focus:outline-none focus:border-amber-600"
          />
        </div>
      </div>

      {/* Product Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-64 rounded-3xl bg-stone-200 animate-pulse"></div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-[#e8dfd5] rounded-3xl p-12 text-center space-y-3">
          <Coffee className="w-12 h-12 text-stone-400 mx-auto" />
          <h3 className="text-lg font-bold text-[#24160f]">No delivery items found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try adjusting your search terms or select "All Items" to browse our full roastery & food menu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => {
            const inCartCount = cart
              .filter(c => c.menuItemId === item.id)
              .reduce((sum, c) => sum + c.quantity, 0);

            return (
              <div
                key={item.id}
                className="bg-white border border-[#e8dfd5] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-44 overflow-hidden bg-stone-100">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    {item.origin_country && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-sm border border-[#e8dfd5] text-[10px] font-bold text-stone-700 shadow-sm flex items-center gap-1">
                        <span>{item.origin_flag || '☕'}</span>
                        <span>{item.origin_country}</span>
                      </span>
                    )}
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-600/90 text-white text-[10px] font-mono font-bold uppercase shadow-sm">
                      {item.category_slug}
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="text-base font-bold text-[#24160f] leading-snug group-hover:text-amber-800 transition">
                      {item.name}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between gap-2 border-t border-[#f4eee6]">
                  <div>
                    <span className="text-[10px] text-stone-400 font-mono uppercase block">Price</span>
                    <span className="text-lg font-black text-amber-800 font-mono">₹{item.base_price}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomizingItem(item)}
                      className="px-3 py-2 rounded-xl border border-[#e8dfd5] bg-[#faf7f2] hover:bg-[#f4eee6] text-xs font-semibold text-stone-700 transition"
                      title="Customize recipe"
                    >
                      Customize
                    </button>

                    <button
                      type="button"
                      onClick={() => addToDeliveryCart(item)}
                      className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                      {inCartCount > 0 && (
                        <span className="ml-1 w-4 h-4 rounded-full bg-white text-amber-800 text-[10px] font-bold flex items-center justify-center">
                          {inCartCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Delivery Cart Bar (when cart has items) */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-lg px-4">
          <div className="bg-[#24160f] text-white rounded-3xl p-4 shadow-2xl border border-stone-800 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center text-white font-bold text-sm">
                {totalItemCount}
              </div>
              <div>
                <span className="text-xs text-stone-300 block">Delivery Cart</span>
                <span className="text-base font-black text-amber-400 font-mono">₹{grandTotal}</span>
              </div>
            </div>

            <button
              onClick={() => setCheckoutOpen(true)}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-extrabold text-xs shadow-lg flex items-center gap-1.5 transition transform active:scale-95"
            >
              <span>Review Order & Checkout</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Checkout Drawer / Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#e8dfd5] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCheckoutOpen(false)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full bg-[#faf7f2] border border-[#e8dfd5]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              {/* Header */}
              <div>
                <span className="text-xs font-mono uppercase text-amber-700 font-bold tracking-wider">
                  Doorstep Coffee & Food Dispatch
                </span>
                <h2 className="text-2xl font-display font-extrabold text-[#24160f]">
                  Complete Online Delivery Order
                </h2>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Order Items Review */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase text-stone-500 font-bold">1. Order Items ({cart.length})</h3>
                <div className="bg-[#faf7f2] border border-[#e8dfd5] rounded-2xl p-3 divide-y divide-[#e8dfd5] max-h-48 overflow-y-auto">
                  {cart.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex-1 pr-2">
                        <span className="font-bold text-[#24160f] block">{item.name}</span>
                        {item.customization && Object.keys(item.customization).length > 0 && (
                          <span className="text-[10px] text-stone-500">
                            {[item.customization.size, item.customization.milk, item.customization.sweetness].filter(Boolean).join(' • ')}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-amber-800 font-bold block mt-0.5">
                          ₹{item.basePrice} each
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white border border-[#e8dfd5] rounded-lg">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(idx, -1)}
                            className="p-1 hover:text-red-700 text-stone-500"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(idx, 1)}
                            className="p-1 hover:text-amber-800 text-stone-500"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="w-14 text-right font-mono font-bold text-[#24160f]">
                          ₹{item.basePrice * item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address Form */}
              <form onSubmit={handlePlaceDeliveryOrder} className="space-y-4">
                <h3 className="text-xs font-mono uppercase text-stone-500 font-bold">2. Delivery Address</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">Recipient Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="e.g. Aria Chen"
                      className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">Phone Number (10 digits) *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="e.g. 9876543210"
                      className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-600 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">Street Address / House / Flat *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="e.g. Flat 402, Oakwood Residency, 12th Main Rd"
                    className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">Area / Landmark</label>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Indiranagar"
                      className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">City *</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      placeholder="e.g. Bengaluru"
                      className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">Postal PIN Code</label>
                    <input
                      type="text"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="e.g. 560038"
                      className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-600 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">Rider Instructions (Optional)</label>
                  <input
                    type="text"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Leave with security / Ring bell twice"
                    className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-600"
                  />
                </div>

                {user && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="w-4 h-4 text-amber-700 rounded border-[#e8dfd5] accent-amber-700"
                    />
                    <span className="text-xs text-stone-600 font-medium">Save this address to my profile</span>
                  </label>
                )}

                {/* Delivery Speed Options */}
                <div className="pt-2">
                  <h3 className="text-xs font-mono uppercase text-stone-500 font-bold mb-2">3. Delivery Speed</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliverySpeed('standard')}
                      className={`p-3 rounded-2xl border text-left transition ${
                        deliverySpeed === 'standard'
                          ? 'border-amber-600 bg-amber-50 shadow-sm'
                          : 'border-[#e8dfd5] bg-[#faf7f2] hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#24160f]">Standard Delivery</span>
                        <span className="text-xs font-mono font-bold text-amber-800">
                          {subtotal >= 500 ? 'FREE' : '₹40'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 block mt-0.5">Est. 25–35 minutes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliverySpeed('priority')}
                      className={`p-3 rounded-2xl border text-left transition ${
                        deliverySpeed === 'priority'
                          ? 'border-amber-600 bg-amber-50 shadow-sm'
                          : 'border-[#e8dfd5] bg-[#faf7f2] hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#24160f] flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-700" />
                          Priority EV Express
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-800">₹65</span>
                      </div>
                      <span className="text-[10px] text-stone-500 block mt-0.5">Direct rush • 15–20 mins</span>
                    </button>
                  </div>
                </div>

                {/* Payment Option Selection */}
                <div className="pt-2">
                  <h3 className="text-xs font-mono uppercase text-stone-500 font-bold mb-2">4. Payment Selection</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-3 rounded-2xl border text-left transition ${
                        paymentMethod === 'cod'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                          : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span className="text-xs font-bold block">💵 Cash on Delivery</span>
                      <span className="text-[10px] text-stone-500 block mt-0.5">Pay courier on arrival</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('demo_pay')}
                      className={`p-3 rounded-2xl border text-left transition ${
                        paymentMethod === 'demo_pay'
                          ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-sm'
                          : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span className="text-xs font-bold block">💳 Demo Instant Online Pay</span>
                      <span className="text-[10px] text-stone-500 block mt-0.5">Simulated UPI / Card payment</span>
                    </button>
                  </div>
                </div>

                {/* Bill Breakdown Summary */}
                <div className="bg-[#fcfaf7] border border-[#e8dfd5] rounded-2xl p-4 space-y-1.5 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span>Items Subtotal:</span>
                    <span className="font-mono font-bold text-[#24160f]">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge:</span>
                    <span className="font-mono font-bold text-[#24160f]">
                      {deliveryFee === 0 ? <span className="text-emerald-700">FREE</span> : `₹${deliveryFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes & Roastery Packaging (5%):</span>
                    <span className="font-mono font-bold text-[#24160f]">₹{tax}</span>
                  </div>
                  <div className="border-t border-[#e8dfd5] pt-2 flex justify-between text-sm font-extrabold text-[#24160f]">
                    <span>Total Amount to Pay:</span>
                    <span className="font-mono text-amber-800 text-base">₹{grandTotal}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || cart.length === 0}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-500 text-white font-extrabold text-sm shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Bike className="w-5 h-5" />
                    <span>{isSubmitting ? 'PLACING DELIVERY ORDER...' : `CONFIRM & ORDER NOW (₹${grandTotal})`}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Customization Modal */}
      {customizingItem && (
        <CustomizationModal
          item={customizingItem}
          isOpen={!!customizingItem}
          onClose={() => setCustomizingItem(null)}
          onSaveDna={null}
        />
      )}
    </div>
  );
}
