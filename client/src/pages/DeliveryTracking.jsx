import React, { useState, useEffect, useRef } from 'react';
import {
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Share2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Truck,
  Package,
  Coffee,
  ChevronLeft
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { useSocket } from '../context/SocketContext';
import { getDeliveryTrackingUrlAsync, getDeliveryTrackingUrl } from '../utils/urlHelper';

export default function DeliveryTracking({ onNavigate, orderId }) {
  const { socket, addToast } = useSocket();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [trackingQrUrl, setTrackingQrUrl] = useState('');
  const [publicTrackingUrl, setPublicTrackingUrl] = useState('');

  const previousStatusRef = useRef(null);

  // 6 Defined Delivery Stages
  const stages = [
    { key: 'placed', label: 'Order Placed', desc: 'Received at roastery', icon: ShoppingBag },
    { key: 'accepted', label: 'Accepted', desc: 'Barista & kitchen assigned', icon: CheckCircle2 },
    { key: 'preparing', label: 'Brewing & Packing', desc: 'Extraction & packaging in progress', icon: Coffee },
    { key: 'ready', label: 'Packed & Ready', desc: 'Thermal sealed & awaiting courier', icon: Package },
    { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Courier on the way to your door', icon: Bike },
    { key: 'delivered', label: 'Delivered', desc: 'Delivered • Enjoy your Daily Drip!', icon: Sparkles }
  ];

  // Helper to determine stage index
  const getStageIndex = (status) => {
    switch (status) {
      case 'placed':
      case 'new':
        return 0;
      case 'accepted':
        return 1;
      case 'preparing':
        return 2;
      case 'ready':
        return 3;
      case 'out_for_delivery':
        return 4;
      case 'delivered':
      case 'completed':
        return 5;
      default:
        return 0;
    }
  };

  // Fetch Order Data
  const fetchOrderData = async () => {
    if (!orderId) {
      setError('No Order ID specified for delivery tracking.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/delivery/orders/${orderId}`);
      if (!res.ok) {
        setError('Delivery order not found or could not be loaded.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setOrder(data);

      // Trigger Confetti if delivered for first time
      const currentStage = getStageIndex(data.delivery_status || data.status);
      if (currentStage === 5 && previousStatusRef.current !== 5) {
        try {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        } catch (_) {}
      }
      previousStatusRef.current = currentStage;
      setError('');
    } catch (err) {
      console.error('Fetch tracking error:', err);
      setError('Network communication error while fetching delivery status.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load & socket setup
  useEffect(() => {
    fetchOrderData();

    // Generate Tracking Share QR Code with public URL
    if (orderId) {
      getDeliveryTrackingUrlAsync(orderId).then(url => {
        setPublicTrackingUrl(url);
        QRCode.toDataURL(url, {
          width: 240,
          margin: 1,
          color: { dark: '#24160f', light: '#ffffff' }
        }).then(setTrackingQrUrl).catch(() => {});
      });
    }

    // Socket.IO real-time listener for delivery updates
    if (socket && orderId) {
      socket.emit('join_delivery_room', { orderId });

      const handleDeliveryUpdate = (updatedOrder) => {
        if (updatedOrder && (updatedOrder.id == orderId || updatedOrder.order_number == orderId)) {
          setOrder(updatedOrder);

          const newStage = getStageIndex(updatedOrder.delivery_status || updatedOrder.status);
          if (newStage === 5 && previousStatusRef.current !== 5) {
            try {
              confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
            } catch (_) {}
          }
          previousStatusRef.current = newStage;

          addToast({
            title: `🛵 Delivery Update: #${updatedOrder.order_number}`,
            message: `Status updated to ${(updatedOrder.delivery_status || updatedOrder.status).toUpperCase().replace(/_/g, ' ')}`,
            type: newStage === 5 ? 'ready' : 'info',
            duration: 4000
          });
        }
      };

      socket.on('delivery_status_updated', handleDeliveryUpdate);
      socket.on('order_status_updated', handleDeliveryUpdate);

      return () => {
        socket.off('delivery_status_updated', handleDeliveryUpdate);
        socket.off('order_status_updated', handleDeliveryUpdate);
      };
    }
  }, [socket, orderId]);

  // Fallback Polling every 7 seconds so tracking never stays stale
  useEffect(() => {
    if (!orderId) return;
    const interval = setInterval(() => {
      fetchOrderData();
    }, 7000);
    return () => clearInterval(interval);
  }, [orderId]);

  const copyTrackingLink = () => {
    const url = publicTrackingUrl || getDeliveryTrackingUrl(orderId);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    addToast({ title: 'Link Copied', message: 'Tracking URL copied to clipboard', type: 'success' });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-3 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h2 className="text-xl font-bold text-[#24160f]">Connecting to Live Roastery Courier Link...</h2>
        <p className="text-xs text-stone-500">Checking delivery satellite telemetry and dispatch status.</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h2 className="text-2xl font-bold text-[#24160f]">Delivery Order Not Found</h2>
        <p className="text-xs text-stone-500">{error || 'Please check your order link.'}</p>
        <button
          onClick={() => onNavigate('delivery')}
          className="px-6 py-2.5 rounded-xl bg-amber-700 text-white font-bold text-xs shadow-md"
        >
          Return to Delivery Menu
        </button>
      </div>
    );
  }

  const currentStageIndex = getStageIndex(order.delivery_status || order.status);
  const deliveryAddress = order.delivery_address || {};
  const isDelivered = currentStageIndex === 5;
  const isOutForDelivery = currentStageIndex === 4;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('delivery')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#24160f] transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Delivery Menu</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrderData}
            className="p-2 rounded-xl border border-[#e8dfd5] bg-white hover:bg-stone-50 text-stone-600 text-xs font-semibold flex items-center gap-1 transition"
            title="Refresh Status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={copyTrackingLink}
            className="px-3 py-2 rounded-xl border border-[#e8dfd5] bg-white hover:bg-stone-50 text-stone-600 text-xs font-semibold flex items-center gap-1 transition"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share Live Tracking'}</span>
          </button>
        </div>
      </div>

      {/* Main Status Hero Card */}
      <div className={`border rounded-3xl p-6 sm:p-8 shadow-sm transition-all ${
        isDelivered
          ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200'
          : isOutForDelivery
          ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200'
          : 'bg-white border-[#e8dfd5]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f4eee6] pb-6">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase text-amber-800 font-bold tracking-wider flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-amber-700" />
              Live Courier Telemetry • Order #{order.order_number}
            </span>
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#24160f]">
              {isDelivered && '🎉 Delivered! Enjoy your Daily Drip!'}
              {isOutForDelivery && '🛵 Courier is on the way to your door!'}
              {currentStageIndex === 3 && '📦 Order packed & awaiting courier pickup'}
              {currentStageIndex === 2 && '☕ Baristas brewing & chef preparing items'}
              {currentStageIndex === 1 && '✅ Order accepted by roastery kitchen'}
              {currentStageIndex === 0 && '🔔 Order placed and sent to kitchen queue'}
            </h1>
            <p className="text-xs text-stone-500">
              Placed on {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Delivery to {deliveryAddress.city || 'Bengaluru'}
            </p>
          </div>

          <div className="shrink-0 text-left sm:text-right bg-[#faf7f2] p-4 rounded-2xl border border-[#e8dfd5]">
            <span className="text-[10px] text-stone-500 uppercase font-mono block">Estimated Time</span>
            <span className="text-2xl font-black font-mono text-amber-800 block">
              {isDelivered ? 'Delivered' : `~${order.estimated_wait_min || 25} Mins`}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live GPS Sync
            </span>
          </div>
        </div>

        {/* 6-Stage Visual Progress Timeline */}
        <div className="pt-8 pb-4">
          <div className="relative">
            {/* Background Line */}
            <div className="hidden sm:block absolute top-1/2 left-6 right-6 h-1.5 bg-stone-200 -translate-y-1/2 z-0 rounded-full"></div>
            {/* Active Colored Line */}
            <div
              className="hidden sm:block absolute top-1/2 left-6 h-1.5 bg-gradient-to-r from-amber-600 to-emerald-600 -translate-y-1/2 z-0 rounded-full transition-all duration-700"
              style={{ width: `calc(${(currentStageIndex / (stages.length - 1)) * 100}% - 3rem)` }}
            ></div>

            {/* Stages Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 relative z-10">
              {stages.map((stg, idx) => {
                const Icon = stg.icon;
                const isPassed = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;

                return (
                  <div key={stg.key} className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-amber-700 text-white ring-4 ring-amber-200 scale-110 shadow-md'
                          : 'bg-white border-2 border-stone-200 text-stone-400'
                      }`}
                    >
                      {isPassed ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>

                    <div>
                      <span className={`text-xs font-bold block ${isCurrent ? 'text-amber-900 font-extrabold' : isPassed ? 'text-stone-700' : 'text-stone-400'}`}>
                        {stg.label}
                      </span>
                      <span className="text-[10px] text-stone-500 hidden sm:block mt-0.5 leading-tight">
                        {stg.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Courier Partner Card (When Out for Delivery) */}
        <div className="mt-6 pt-6 border-t border-[#f4eee6] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#faf7f2] p-4 rounded-2xl border border-[#e8dfd5]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-700 text-white flex items-center justify-center font-display font-extrabold text-lg shadow-sm">
              🛵
            </div>
            <div>
              <span className="text-[10px] font-mono text-stone-500 uppercase block">Delivery Courier</span>
              <span className="text-sm font-bold text-[#24160f] block">
                {order.delivery_partner || 'Vikram Singh • EV Express'}
              </span>
              <span className="text-[10px] text-amber-800 font-semibold">
                Electric Ather 450X • 4.95 ★ (1,400+ deliveries)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => addToast({ title: 'Rider Contact', message: 'Calling courier partner Vikram Singh (Demo)', type: 'info' })}
              className="px-4 py-2 rounded-xl bg-white border border-[#e8dfd5] hover:bg-stone-100 text-xs font-bold text-stone-700 flex items-center gap-1.5 transition"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Call Courier</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Delivery Details + QR Code Share */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Delivery Address & Order Items */}
        <div className="lg:col-span-8 space-y-6">
          {/* Destination Address Card */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-mono uppercase text-amber-800 font-bold flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-700" />
              <span>Delivering To Destination</span>
            </h3>

            <div className="text-xs text-stone-600 space-y-1">
              <span className="text-sm font-bold text-[#24160f] block">
                {deliveryAddress.name || order.guest_name} ({deliveryAddress.phone || 'Contact provided'})
              </span>
              <p className="leading-relaxed">
                {deliveryAddress.address}
                {deliveryAddress.apartment && `, ${deliveryAddress.apartment}`}
                {deliveryAddress.area && `, ${deliveryAddress.area}`}
                {deliveryAddress.city && `, ${deliveryAddress.city}`}
                {deliveryAddress.pinCode && ` - ${deliveryAddress.pinCode}`}
              </p>
              {deliveryAddress.instructions && (
                <div className="pt-2 text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <strong>Rider Note:</strong> {deliveryAddress.instructions}
                </div>
              )}
            </div>
          </div>

          {/* Ordered Products Breakdown */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-mono uppercase text-stone-500 font-bold flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-stone-400" />
              <span>Items in this Delivery ({(order.items || []).length})</span>
            </h3>

            <div className="divide-y divide-[#f4eee6]">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#24160f] text-sm block">
                      {item.quantity}x {item.name}
                    </span>
                    {item.customization && (
                      <span className="text-[11px] text-stone-500 block mt-0.5">
                        {[item.customization.size, item.customization.milk, item.customization.sweetness, item.customization.temperature].filter(Boolean).join(' • ')}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-stone-800">
                    ₹{item.item_total || item.base_price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="pt-3 border-t border-[#e8dfd5] space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-semibold uppercase text-stone-800 font-mono">
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Paid (Demo Online Pay)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span className="font-mono font-bold text-stone-800">
                  {order.delivery_fee === 0 ? <span className="text-emerald-700">FREE</span> : `₹${order.delivery_fee || 40}`}
                </span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#24160f] pt-1 border-t border-[#f4eee6]">
                <span>Total Amount Paid:</span>
                <span className="font-mono text-amber-800">₹{order.total_amount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Share Tracking QR Code Card */}
        <div className="lg:col-span-4 bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-4 text-center">
          <span className="text-xs font-mono uppercase text-amber-800 font-bold block">
            Scan to Track on Mobile
          </span>

          <div className="bg-[#faf7f2] p-4 rounded-2xl border border-[#e8dfd5] inline-block mx-auto">
            {trackingQrUrl ? (
              <img
                src={trackingQrUrl}
                alt="Delivery Tracking QR Code"
                className="w-40 h-40 mx-auto object-contain rounded-xl bg-white p-2 border border-[#e8dfd5]"
              />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-xs font-mono text-stone-400">
                Generating QR...
              </div>
            )}
          </div>

          <p className="text-[11px] text-stone-500 leading-relaxed">
            Anyone with this QR code or link can watch the courier move in real-time.
          </p>

          <button
            onClick={copyTrackingLink}
            className="w-full py-2.5 rounded-xl border border-[#e8dfd5] bg-[#faf7f2] hover:bg-[#f4eee6] text-xs font-bold text-stone-700 flex items-center justify-center gap-1.5 transition"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Tracking Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
