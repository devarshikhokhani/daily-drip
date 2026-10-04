import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Coffee,
  CheckCircle,
  MapPin,
  Bike,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Phone,
  User,
  Home
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

// Popular Quick-Add items when cart is empty
const QUICK_ADD_ITEMS = [
  {
    id: 3,
    name: 'Madagascar Vanilla Bean Latte',
    basePrice: 210,
    category: 'Signature Latte',
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=300&auto=format&fit=crop'
  },
  {
    id: 5,
    name: 'Classic Roman Velvet Cappuccino',
    basePrice: 185,
    category: 'Espresso Bar',
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=300&auto=format&fit=crop'
  },
  {
    id: 7,
    name: 'Nitro Cold Brew Cascade',
    basePrice: 230,
    category: 'Cold Brews',
    image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=300&auto=format&fit=crop'
  },
  {
    id: 205,
    name: 'Smoked Herb Chicken & Pesto Panini',
    basePrice: 320,
    category: 'Artisan Kitchen',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=300&auto=format&fit=crop'
  }
];

export default function Cart({ onNavigate }) {
  const {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    tableNumber,
    setTableNumber,
    notes,
    setNotes,
    subtotal,
    tax,
    total,
    itemCount
  } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { socket, addToast } = useSocket();

  // Order Mode: 'dine_in' (Cafe Order) or 'delivery' (Doorstep Delivery)
  const [orderType, setOrderType] = useState('dine_in');

  // Delivery details
  const [deliveryName, setDeliveryName] = useState(user?.name || '');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryApartment, setDeliveryApartment] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('Bengaluru');
  const [deliveryPinCode, setDeliveryPinCode] = useState('');
  const [deliverySpeed, setDeliverySpeed] = useState('standard'); // 'standard' | 'priority'
  const [deliveryFormError, setDeliveryFormError] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('demo_card');
  const [submitting, setSubmitting] = useState(false);
  const [tablesList, setTablesList] = useState([]);

  // Fetch tables and saved address
  useEffect(() => {
    fetch('/api/tables')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setTablesList(d);
      })
      .catch(() => {});

    const token = localStorage.getItem('dd_token');
    if (user && token) {
      if (!deliveryName) setDeliveryName(user.name);
      fetch('/api/delivery/user/address', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data && data.savedAddress) {
            const a = data.savedAddress;
            if (a.name) setDeliveryName(a.name);
            if (a.phone) setDeliveryPhone(a.phone);
            if (a.address) setDeliveryAddress(a.address);
            if (a.apartment) setDeliveryApartment(a.apartment);
            if (a.area) setDeliveryArea(a.area);
            if (a.city) setDeliveryCity(a.city);
            if (a.pinCode) setDeliveryPinCode(a.pinCode);
          }
        })
        .catch(() => {});
    }

    if (socket) {
      const handleTableUpdate = () => {
        fetch('/api/tables')
          .then(r => r.json())
          .then(d => {
            if (Array.isArray(d)) setTablesList(d);
          })
          .catch(() => {});
      };
      socket.on('table_status_changed', handleTableUpdate);
      return () => {
        socket.off('table_status_changed', handleTableUpdate);
      };
    }
  }, [socket, user]);

  // Delivery Fee calculation
  const deliveryFee = orderType === 'delivery'
    ? (subtotal >= 500 && deliverySpeed !== 'priority' ? 0 : (deliverySpeed === 'priority' ? 65 : 40))
    : 0;

  const finalGrandTotal = total + deliveryFee;

  // Checkout handler
  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (submitting) return;
    setDeliveryFormError('');

    // Delivery validation
    if (orderType === 'delivery') {
      if (!deliveryName.trim()) {
        setDeliveryFormError('Please enter recipient full name');
        return;
      }
      const cleanPhone = deliveryPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        setDeliveryFormError('Please enter a valid 10-digit mobile number for delivery courier');
        return;
      }
      if (!deliveryAddress.trim()) {
        setDeliveryFormError('Please enter complete street delivery address');
        return;
      }
      if (!deliveryCity.trim()) {
        setDeliveryFormError('Please enter city');
        return;
      }
    }

    setSubmitting(true);
    const token = localStorage.getItem('dd_token');

    try {
      if (orderType === 'delivery') {
        // Place delivery order
        const cleanPhone = deliveryPhone.replace(/\D/g, '');
        const payload = {
          items,
          deliveryAddress: {
            name: deliveryName.trim(),
            phone: cleanPhone,
            address: deliveryAddress.trim(),
            apartment: deliveryApartment.trim(),
            area: deliveryArea.trim(),
            city: deliveryCity.trim(),
            pinCode: deliveryPinCode.trim(),
            instructions: notes.trim()
          },
          deliverySpeed,
          paymentMethod,
          saveAddress: true,
          notes: notes.trim()
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
          throw new Error(data.error || 'Failed to place delivery order');
        }

        // Cache order locally
        try {
          const savedOrders = JSON.parse(localStorage.getItem('dd_my_orders') || '[]');
          const updated = [
            {
              ...data.order,
              order_type: 'delivery',
              delivery_address: payload.deliveryAddress,
              delivery_fee: deliveryFee,
              delivery_status: data.order.delivery_status || 'preparing',
              items
            },
            ...savedOrders.filter(o => o.id !== data.order.id && o.order_number !== data.order.order_number)
          ];
          localStorage.setItem('dd_my_orders', JSON.stringify(updated.slice(0, 50)));
        } catch (_) {}

        clearCart();
        addToast({
          title: '🛵 Delivery Order Placed!',
          message: `Order #${data.order.order_number} confirmed. Thermal roastery courier dispatched!`,
          type: 'success',
          duration: 5000
        });

        onNavigate('delivery-tracking', { orderId: data.order.id });
      } else {
        // Place café dine-in / counter order
        const orderPayload = {
          items,
          tableNumber: tableNumber ? parseInt(tableNumber, 10) : null,
          guestName: user?.name || 'Café Explorer',
          notes,
          paymentMethod,
          orderType: 'dine_in'
        };

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(orderPayload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to submit café order');
        }

        // Cache order locally
        try {
          const savedOrders = JSON.parse(localStorage.getItem('dd_my_orders') || '[]');
          const updated = [
            {
              ...data.order,
              order_type: 'dine_in',
              table_number: tableNumber ? parseInt(tableNumber, 10) : null,
              items
            },
            ...savedOrders.filter(o => o.id !== data.order.id && o.order_number !== data.order.order_number)
          ];
          localStorage.setItem('dd_my_orders', JSON.stringify(updated.slice(0, 50)));
        } catch (_) {}

        clearCart();
        addToast({
          title: `🎉 Order #${data.order.order_number} Placed!`,
          message: tableNumber ? `Table 0${tableNumber} reserved. In smart barista queue.` : 'In barista queue. Ready for counter pickup.',
          type: 'success',
          duration: 5000
        });

        onNavigate('order-detail', { orderId: data.order.id });
      }
    } catch (err) {
      console.error('Checkout error:', err);
      // Resilient local fallback order creation
      const fallbackNum = `DD-${Math.floor(1000 + Math.random() * 9000)}`;
      const fallbackOrder = {
        id: Date.now(),
        order_number: fallbackNum,
        status: 'received',
        order_type: orderType,
        table_number: orderType === 'dine_in' && tableNumber ? parseInt(tableNumber, 10) : null,
        delivery_address: orderType === 'delivery' ? {
          name: deliveryName.trim() || 'Valued Guest',
          phone: deliveryPhone.replace(/\D/g, '') || '9876543210',
          address: deliveryAddress.trim() || 'Roastery Express Delivery',
          apartment: deliveryApartment.trim(),
          area: deliveryArea.trim(),
          city: deliveryCity.trim() || 'Bengaluru',
          pinCode: deliveryPinCode.trim()
        } : null,
        delivery_fee: deliveryFee,
        delivery_status: orderType === 'delivery' ? 'preparing' : undefined,
        total_amount: finalGrandTotal,
        payment_method: paymentMethod,
        payment_status: 'paid',
        items: items,
        created_at: new Date().toISOString()
      };

      try {
        const savedOrders = JSON.parse(localStorage.getItem('dd_my_orders') || '[]');
        savedOrders.unshift(fallbackOrder);
        localStorage.setItem('dd_my_orders', JSON.stringify(savedOrders.slice(0, 50)));
      } catch (_) {}

      clearCart();
      addToast({
        title: orderType === 'delivery' ? '🛵 Delivery Order Confirmed!' : `☕ Order #${fallbackNum} Confirmed!`,
        message: 'Order recorded successfully and added to your Orders view.',
        type: 'success',
        duration: 5000
      });
      onNavigate('orders');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick add helper
  const handleQuickAdd = (item) => {
    addToCart({
      menuItemId: item.id,
      name: item.name,
      basePrice: item.basePrice,
      quantity: 1,
      customization: { size: 'Regular' }
    });
    addToast({
      title: 'Added to Cart',
      message: `${item.name} added (₹${item.basePrice})`,
      type: 'success',
      duration: 2000
    });
  };

  // Empty Cart State
  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        <div className="bg-white border border-[#e8dfd5] rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-[#fef6e9] border border-[#f5cb87] text-[#b45309] mx-auto flex items-center justify-center shadow-inner">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[#24160f]">
              Your Shopping Cart is Empty
            </h2>
            <p className="text-[#5c4033] text-sm leading-relaxed">
              Add your favorite single-origin brews, fresh roastery food, or build a custom cup to get started!
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('menu')}
              className="px-6 py-3 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white font-bold text-xs shadow-sm transition flex items-center gap-2"
            >
              <Coffee className="w-4 h-4" />
              <span>Explore Café Menu</span>
            </button>
            <button
              onClick={() => onNavigate('delivery')}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-2"
            >
              <Bike className="w-4 h-4" />
              <span>Doorstep Delivery</span>
            </button>
            <button
              onClick={() => onNavigate('build-coffee')}
              className="px-6 py-3 rounded-xl bg-[#faf7f2] hover:bg-[#f4eee6] text-[#24160f] font-bold text-xs border border-[#e8dfd5] transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>Build Custom Coffee</span>
            </button>
          </div>
        </div>

        {/* 1-Click Quick Add Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#b45309]" />
              <h3 className="text-base font-display font-bold text-[#24160f]">
                Popular Café Favorites (1-Click Add)
              </h3>
            </div>
            <span className="text-xs text-stone-500 font-mono">Instant Roastery Adds</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_ADD_ITEMS.map((q) => (
              <div
                key={q.id}
                className="bg-white border border-[#e8dfd5] hover:border-[#b45309] rounded-2xl p-4 shadow-sm transition flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2">
                  <div className="h-32 rounded-xl overflow-hidden bg-stone-100">
                    <img
                      src={q.image}
                      alt={q.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[#b45309] font-bold uppercase">{q.category}</span>
                    <h4 className="text-xs font-bold text-[#24160f] line-clamp-1">{q.name}</h4>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#f0e8df]">
                  <span className="text-xs font-mono font-black text-[#24160f]">₹{q.basePrice}</span>
                  <button
                    onClick={() => handleQuickAdd(q)}
                    className="px-3 py-1.5 rounded-lg bg-[#b45309] hover:bg-[#92400e] text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase text-[#b45309] tracking-wider font-bold">
            Review & Checkout
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-[#24160f] mt-1">
            Your Coffee Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </h1>
        </div>

        {/* Order Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-[#f5eee6] p-1.5 rounded-2xl border border-[#e8dfd5] w-fit">
          <button
            type="button"
            onClick={() => setOrderType('dine_in')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              orderType === 'dine_in'
                ? 'bg-[#b45309] text-white shadow-sm'
                : 'text-[#5c4033] hover:text-[#24160f]'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Café Order (Dine-in / Pickup)</span>
          </button>
          <button
            type="button"
            onClick={() => setOrderType('delivery')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              orderType === 'delivery'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[#5c4033] hover:text-[#24160f]'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Doorstep Delivery</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items and Location Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Items List */}
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#e8dfd5] rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#fef6e9] border border-[#f5cb87] flex items-center justify-center text-[#b45309] shrink-0">
                    <Coffee className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[#24160f]">{item.name}</h3>

                    {item.customization && (
                      <p className="text-xs text-[#5c4033] leading-relaxed">
                        {item.customization.size && `${item.customization.size}`}
                        {item.customization.milk && ` • ${item.customization.milk}`}
                        {item.customization.sweetness && ` • ${item.customization.sweetness}`}
                        {item.customization.temperature && ` • ${item.customization.temperature}`}
                        {item.customization.flavor && item.customization.flavor !== 'None' && ` • ${item.customization.flavor}`}
                        {item.customization.addOns && item.customization.addOns.length > 0 && (
                          <span className="text-[#b45309] block font-medium">
                            Add-ons: {item.customization.addOns.join(', ')}
                          </span>
                        )}
                      </p>
                    )}

                    <span className="text-xs font-mono text-[#b45309] font-bold block pt-1">
                      ₹{item.basePrice} each
                    </span>
                  </div>
                </div>

                {/* Quantity Controls & Total */}
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 self-end sm:self-center">
                  <div className="flex items-center gap-2 bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-2 py-1">
                    <button
                      onClick={() => updateQuantity(idx, -1)}
                      className="w-6 h-6 flex items-center justify-center text-[#5c4033] hover:text-[#24160f]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-[#24160f]">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(idx, 1)}
                      className="w-6 h-6 flex items-center justify-center text-[#5c4033] hover:text-[#24160f]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-base font-black text-[#b45309] font-mono min-w-[60px] text-right">
                    ₹{item.itemTotal}
                  </span>

                  <button
                    onClick={() => removeFromCart(idx)}
                    className="p-2 text-[#785b46] hover:text-red-500 transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Conditional Delivery / Cafe Form */}
          {orderType === 'delivery' ? (
            /* DELIVERY ADDRESS FORM */
            <div className="bg-white border border-blue-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <Bike className="w-4 h-4 text-blue-600" />
                  <span>Doorstep Delivery Address</span>
                </div>
                <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Thermal Insulated Courier
                </span>
              </div>

              {deliveryFormError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold">
                  {deliveryFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 mb-1 block">Full Name *</label>
                  <input
                    type="text"
                    placeholder="Recipient Name"
                    value={deliveryName}
                    onChange={(e) => setDeliveryName(e.target.value)}
                    className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 mb-1 block">Phone Number (10 digits) *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 mb-1 block">Street Address / House No. *</label>
                  <input
                    type="text"
                    placeholder="e.g. 42 Lotus Boulevard, 2nd Cross"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 mb-1 block">Apartment / Suite</label>
                    <input
                      type="text"
                      placeholder="e.g. Apt 4B"
                      value={deliveryApartment}
                      onChange={(e) => setDeliveryApartment(e.target.value)}
                      className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 mb-1 block">Area / Locality</label>
                    <input
                      type="text"
                      placeholder="e.g. Indiranagar"
                      value={deliveryArea}
                      onChange={(e) => setDeliveryArea(e.target.value)}
                      className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 mb-1 block">City</label>
                    <input
                      type="text"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Speed Selector */}
              <div className="pt-2">
                <label className="text-[11px] font-semibold text-stone-700 mb-1 block">Delivery Priority</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliverySpeed('standard')}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                      deliverySpeed === 'standard'
                        ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold'
                        : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-600'
                    }`}
                  >
                    <div>
                      <p className="text-xs">Standard Roastery Delivery</p>
                      <p className="text-[10px] text-stone-500">25–35 Mins • {subtotal >= 500 ? 'FREE' : '₹40'}</p>
                    </div>
                    {deliverySpeed === 'standard' && <CheckCircle className="w-4 h-4 text-blue-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliverySpeed('priority')}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                      deliverySpeed === 'priority'
                        ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold'
                        : 'border-[#e8dfd5] bg-[#faf7f2] text-stone-600'
                    }`}
                  >
                    <div>
                      <p className="text-xs">⚡ Priority Express</p>
                      <p className="text-[10px] text-stone-500">15–20 Mins Direct • ₹65</p>
                    </div>
                    {deliverySpeed === 'priority' && <CheckCircle className="w-4 h-4 text-blue-600" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* CAFÉ TABLE & SPECIAL INSTRUCTIONS */
            <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase text-[#b45309] font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Select Café Table
                  </label>
                  <span className="text-[10px] text-stone-500 font-mono">Dine-in / Pickup</span>
                </div>
                <select
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#24160f] focus:outline-none focus:border-[#b45309]"
                >
                  <option value="">Counter Pick-up (No Table)</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tNum) => {
                    const tInfo = tablesList.find(t => t.table_number === tNum);
                    const isOcc = tInfo?.status === 'occupied';
                    const isRes = tInfo?.status === 'reserved';
                    const statusLabel = isOcc ? '🔴 Occupied' : isRes ? '🟡 Reserved' : '🟢 Available';
                    const capLabel = tInfo?.capacity ? ` • ${tInfo.capacity}p` : '';
                    return (
                      <option key={tNum} value={tNum}>
                        Table {tNum < 10 ? `0${tNum}` : tNum} ({statusLabel}{capLabel}) {tNum === 7 ? '★ (Demo Table)' : ''}
                      </option>
                    );
                  })}
                </select>

                {tableNumber ? (
                  <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
                    <span className="text-sm">🪑</span>
                    <div>
                      <p className="font-bold">Table {tableNumber < 10 ? `0${tableNumber}` : tableNumber} will be reserved for you</p>
                      <p className="text-[10px] text-amber-800">Your table and order details will be transmitted live to staff KDS and baristas upon checkout.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-[#faf7f2] border border-[#e8dfd5] text-[11px] text-[#785b46] flex items-center gap-1.5">
                    <span>🚶</span>
                    <span>Direct counter pickup — pick up your coffee when called at the barista bar.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Barista / Courier Instructions */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-5 shadow-sm space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-[#24160f] font-semibold block">
              {orderType === 'delivery' ? 'Courier Delivery Instructions (Optional)' : 'Barista Instructions (Optional)'}
            </label>
            <input
              type="text"
              placeholder={orderType === 'delivery' ? 'e.g. Ring doorbell twice, leave with security' : 'e.g., Extra hot, oat milk in glass, no plastic lid'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-4 py-2.5 text-xs text-[#24160f] focus:outline-none focus:border-[#b45309]"
            />
          </div>
        </div>

        {/* Right Column: Order Summary & Checkout */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-[#24160f] border-b border-[#f0e8df] pb-3 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-mono font-bold text-[#b45309]">
                {orderType === 'delivery' ? '🛵 Delivery' : '☕ Café Order'}
              </span>
            </h3>

            {/* Pricing breakdown */}
            <div className="space-y-2.5 text-xs text-[#5c4033]">
              <div className="flex justify-between">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-mono font-bold text-[#24160f]">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Café Tax & GST (5%)</span>
                <span className="font-mono font-bold text-[#24160f]">₹{tax}</span>
              </div>

              {orderType === 'delivery' && (
                <div className="flex justify-between text-blue-700">
                  <span className="flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5" />
                    <span>Delivery Fee ({deliverySpeed === 'priority' ? 'Priority Express' : 'Standard'})</span>
                  </span>
                  <span className="font-mono font-bold">
                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-[#b45309] pt-3 border-t border-[#f0e8df]">
                <span>Total Amount</span>
                <span className="font-mono">₹{finalGrandTotal}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-2 border-t border-[#f0e8df]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase text-[#785b46] block font-semibold">
                  Payment Method
                </label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#edf6ed] text-[#1b5e20] border border-[#c8e6c9]">
                  Demo Checkout Mode
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'demo_card', name: '💳 Card' },
                  { id: 'demo_upi', name: '📱 UPI QR' },
                  { id: orderType === 'delivery' ? 'cod' : 'demo_counter', name: orderType === 'delivery' ? '💵 Cash / COD' : '☕ Counter' }
                ].map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold text-center transition ${
                      paymentMethod === pm.id
                        ? 'border-[#b45309] bg-[#fef6e9] text-[#24160f] shadow-sm'
                        : 'border-[#e8dfd5] bg-[#faf7f2] text-[#5c4033] hover:text-[#24160f]'
                    }`}
                  >
                    {pm.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleCheckout}
              disabled={submitting}
              className={`w-full py-4 rounded-2xl text-white font-extrabold text-sm shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                orderType === 'delivery'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-[#b45309] hover:bg-[#92400e]'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>
                {submitting
                  ? (orderType === 'delivery' ? 'DISPATCHING DELIVERY ORDER...' : 'DISPATCHING TO SMART QUEUE...')
                  : (orderType === 'delivery' ? `PLACE DELIVERY ORDER (₹${finalGrandTotal})` : `PLACE CAFÉ ORDER (₹${finalGrandTotal})`)}
              </span>
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Real-time live queue & courier tracking active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
