import React, { useState, useEffect } from 'react';
import {
  Clock,
  Users,
  Coffee,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSocket } from '../context/SocketContext';
import { useCart } from '../context/CartContext';

export default function OrderDetail({ orderId, onNavigate }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket, addToast } = useSocket();
  const { addToCart } = useCart();

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        if (data.status === 'ready') {
          try {
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    if (socket) {
      const handleStatusUpdate = (updatedOrder) => {
        if (updatedOrder.id === parseInt(orderId, 10)) {
          setOrder(prev => ({ ...prev, ...updatedOrder }));
          if (updatedOrder.status === 'ready') {
            try {
              confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
            } catch (e) {}
          }
        }
      };

      socket.on('order_status_updated', handleStatusUpdate);
      return () => {
        socket.off('order_status_updated', handleStatusUpdate);
      };
    }
  }, [orderId, socket]);

  if (loading) {
    return (
      <div className="py-24 text-center text-[#785b46] space-y-3">
        <div className="w-10 h-10 border-2 border-[#b45309] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-mono uppercase tracking-wider">Connecting to Smart Queue...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-[#b45309] mx-auto" />
        <h3 className="text-base font-bold text-[#24160f]">Order Not Found</h3>
        <button onClick={() => onNavigate('orders')} className="text-xs text-[#b45309] underline">
          Back to Orders
        </button>
      </div>
    );
  }

  const steps = [
    { key: 'new', label: 'Order Received' },
    { key: 'accepted', label: 'Accepted by Barista' },
    { key: 'preparing', label: 'Preparing at Counter' },
    { key: 'ready', label: 'Ready for Pick-up' },
    { key: 'completed', label: 'Completed' }
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'new': return 0;
      case 'accepted': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      case 'completed': return 4;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top back button */}
      <button
        onClick={() => onNavigate('orders')}
        className="text-[#5c4033] hover:text-[#24160f] text-xs font-semibold flex items-center gap-1.5 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Order History</span>
      </button>

      {/* Main Order Header Card */}
      <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f0e8df] pb-4">
          <div>
            <span className="text-xs font-mono uppercase text-[#b45309] font-bold">
              Smart Café Queue
            </span>
            <h1 className="text-3xl sm:text-4xl font-mono font-black text-[#24160f]">
              ORDER #{order.order_number}
            </h1>
            <p className="text-xs text-[#5c4033] mt-1">
              Guest: <strong>{order.guest_name}</strong> • Table: <strong>{order.table_number ? `Table ${order.table_number}` : 'Counter'}</strong>
            </p>
          </div>

          {/* Status Badge */}
          <div className="sm:text-right">
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono ${
              order.status === 'ready'
                ? 'bg-[#edf6ed] text-[#1b5e20] border border-[#c8e6c9] animate-pulse'
                : order.status === 'preparing'
                ? 'bg-[#fef6e9] text-[#b45309] border border-[#f5cb87]'
                : order.status === 'completed'
                ? 'bg-[#faf7f2] text-[#5c4033] border border-[#e8dfd5]'
                : 'bg-sky-50 text-sky-800 border border-sky-200'
            }`}>
              {order.status === 'ready' && '🎉 READY!'}
              {order.status === 'preparing' && '☕ PREPARING'}
              {order.status === 'accepted' && '✓ ACCEPTED'}
              {order.status === 'new' && '⏳ QUEUED'}
              {order.status === 'completed' && '✓ COMPLETED'}
            </span>
            <span className="text-[10px] text-[#785b46] block mt-1 font-mono">
              {new Date(order.created_at).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Live Queue Workload Counters */}
        {['new', 'accepted', 'preparing'].includes(order.status) && (
          <div className="grid grid-cols-2 gap-4 bg-[#fef6e9] p-4 rounded-2xl border border-[#f5cb87]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#f5cb87] flex items-center justify-center text-[#b45309]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#785b46] uppercase block">Queue Position</span>
                <span className="text-base font-bold text-[#24160f]">
                  👥 {order.ordersBefore || 0} order{order.ordersBefore !== 1 ? 's' : ''} before you
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#f5cb87] flex items-center justify-center text-[#b45309]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#785b46] uppercase block">Estimated Wait</span>
                <span className="text-base font-bold text-[#b45309]">
                  ⏱️ {order.estimatedWaitMin || 6}–{Math.max(8, (order.estimatedWaitMin || 6) + 4)} min
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Ready Celebration Banner */}
        {order.status === 'ready' && (
          <div className="p-5 rounded-2xl bg-[#edf6ed] border-2 border-[#a3d9a5] text-center space-y-1 animate-bounce">
            <h3 className="text-lg font-bold text-[#1b5e20]">
              🎉 YOUR COFFEE IS READY!
            </h3>
            <p className="text-xs text-[#2d4026]">
              Please collect from the barista bar or enjoy at Table {order.table_number || '07'}.
            </p>
          </div>
        )}

        {/* Visual Progress Stepper */}
        <div className="space-y-4 pt-2">
          <div className="relative">
            <div className="grid grid-cols-5 text-center gap-2">
              {steps.map((st, i) => {
                const isDone = i < currentStepIdx;
                const isCurrent = i === currentStepIdx;
                return (
                  <div key={st.key} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-[#b45309] text-white'
                        : isCurrent
                        ? 'bg-[#c2410c] text-white ring-4 ring-[#f5cb87] animate-pulse'
                        : 'bg-[#faf7f2] text-[#785b46] border border-[#e8dfd5]'
                    }`}>
                      {isDone ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-[10px] font-mono mt-2 block leading-tight ${
                      isCurrent ? 'text-[#b45309] font-bold' : isDone ? 'text-[#24160f]' : 'text-[#785b46]'
                    }`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Items List */}
        <div className="pt-4 border-t border-[#f0e8df] space-y-3">
          <h4 className="text-xs font-mono uppercase text-[#b45309] font-bold">
            Order Items
          </h4>
          <div className="space-y-2">
            {(order.items || []).map((item, idx) => (
              <div
                key={idx}
                className="bg-[#faf7f2] p-3 rounded-xl border border-[#e8dfd5] flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-bold text-[#24160f]">
                    {item.quantity}x {item.name}
                  </p>
                  {item.customization && (
                    <p className="text-xs text-[#5c4033]">
                      {item.customization.size && `${item.customization.size}`}
                      {item.customization.milk && ` • ${item.customization.milk}`}
                      {item.customization.sweetness && ` • ${item.customization.sweetness}`}
                      {item.customization.temperature && ` • ${item.customization.temperature}`}
                    </p>
                  )}
                </div>
                <span className="text-sm font-mono font-bold text-[#b45309]">
                  ₹{item.item_total || item.itemTotal}
                </span>
              </div>
            ))}
          </div>

          {/* Cup Drawing Attachment if any */}
          {order.cup_design_data && (
            <div className="mt-4 p-4 rounded-2xl bg-[#faf7f2] border border-[#e8dfd5] text-center space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#b45309] font-bold block">
                Attached Custom Cup Artwork
              </span>
              <img
                src={order.cup_design_data}
                alt="Custom Cup Art"
                className="w-48 h-auto mx-auto rounded-xl border border-[#e8dfd5] bg-white p-2"
              />
            </div>
          )}

          {/* Total & Reorder Button */}
          <div className="pt-4 flex items-center justify-between">
            <span className="text-lg font-mono font-black text-[#24160f]">
              Total Paid: ₹{order.total_amount}
            </span>

            <button
              onClick={() => {
                for (const it of (order.items || [])) {
                  addToCart({
                    name: it.name,
                    basePrice: it.base_price,
                    quantity: it.quantity,
                    customization: it.customization
                  });
                }
                addToast({ title: 'Items Added', message: 'Added to cart for reorder', type: 'success' });
                onNavigate('cart');
              }}
              className="px-4 py-2 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reorder Drinks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
