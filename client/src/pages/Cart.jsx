import React, { useState } from 'react';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Coffee,
  CheckCircle,
  MapPin
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Cart({ onNavigate }) {
  const {
    items,
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
  const { addToast } = useSocket();

  const [paymentMethod, setPaymentMethod] = useState('demo_card');
  const [submitting, setSubmitting] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (submitting) return;

    setSubmitting(true);
    try {
      const orderPayload = {
        items,
        tableNumber: tableNumber ? parseInt(tableNumber, 10) : 7,
        guestName: user?.name || 'Café Explorer',
        notes,
        paymentMethod
      };

      const token = localStorage.getItem('dd_token');
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
        addToast({ title: 'Order Failed', message: data.error || 'Failed to submit order', type: 'alert' });
        setSubmitting(false);
        return;
      }

      clearCart();
      addToast({
        title: `🎉 Order #${data.order.order_number} Placed!`,
        message: 'Your coffee is in the smart café queue',
        type: 'success'
      });

      onNavigate('order-detail', { orderId: data.order.id });
    } catch (err) {
      console.error('Checkout error:', err);
      addToast({ title: 'Network Error', message: 'Could not connect to café server', type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#fef6e9] border border-[#f5cb87] text-[#b45309] mx-auto flex items-center justify-center">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-[#24160f]">Your Cart is Empty</h2>
        <p className="text-[#5c4033] text-sm">
          Discover our single-origin roasts or craft a custom brew in the Coffee Builder.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('menu')}
            className="px-6 py-3 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white font-bold text-xs shadow-sm"
          >
            Explore Menu
          </button>
          <button
            onClick={() => onNavigate('build-coffee')}
            className="px-6 py-3 rounded-xl bg-[#faf7f2] hover:bg-[#f4eee6] text-[#24160f] font-bold text-xs border border-[#e8dfd5]"
          >
            Build Coffee
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-mono uppercase text-[#b45309] tracking-wider font-bold">
          Review & Place Order
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-[#24160f] mt-1">
          Your Coffee Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-7 space-y-4">
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

          {/* Special Instructions Notes */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-5 shadow-sm space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-[#24160f] font-semibold block">
              Barista Instructions (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Extra hot, oat milk in glass, no plastic lid"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-4 py-2.5 text-xs text-[#24160f] focus:outline-none focus:border-[#b45309]"
            />
          </div>
        </div>

        {/* Right: Order Summary & Demo Checkout */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-[#24160f] border-b border-[#f0e8df] pb-3">
              Order Summary
            </h3>

            {/* Table Selection */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-[#b45309] font-bold block flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Select Café Table
              </label>
              <select
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#24160f] focus:outline-none focus:border-[#b45309]"
              >
                <option value="">Counter Pick-up (No Table)</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
                  <option key={t} value={t}>
                    Table {t < 10 ? `0${t}` : t} {t === 7 ? '★ (Demo Session Table)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing breakdown */}
            <div className="space-y-2 text-xs text-[#5c4033] pt-2 border-t border-[#f0e8df]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-[#24160f]">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Café Tax & GST (5%)</span>
                <span className="font-mono font-bold text-[#24160f]">₹{tax}</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#b45309] pt-2 border-t border-[#f0e8df]">
                <span>Total Amount</span>
                <span className="font-mono">₹{total}</span>
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
                  { id: 'demo_card', name: '💳 Demo Card' },
                  { id: 'demo_upi', name: '📱 UPI QR' },
                  { id: 'demo_counter', name: '☕ Counter Pay' }
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
              className="w-full py-4 rounded-2xl bg-[#b45309] hover:bg-[#92400e] text-white font-extrabold text-sm shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{submitting ? 'DISPATCHING TO SMART QUEUE...' : `PLACE ORDER (₹${total})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
