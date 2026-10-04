import React, { useState, useEffect } from 'react';
import {
  Coffee,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Eye,
  Bike,
  MapPin,
  Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';

const STATUS_STYLES = {
  ready: 'bg-[#edf6ed] text-[#1b5e20] border border-[#c8e6c9] animate-pulse',
  preparing: 'bg-[#fef6e9] text-[#b45309] border border-[#f5cb87]',
  completed: 'bg-[#faf7f2] text-[#5c4033] border border-[#e8dfd5]',
  delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  out_for_delivery: 'bg-blue-50 text-blue-700 border border-blue-200',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
};

function statusStyle(status) {
  return STATUS_STYLES[status] || 'bg-sky-50 text-sky-800 border border-sky-200';
}

export default function Orders({ onNavigate }) {
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { socket, addToast } = useSocket();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cafe'); // 'cafe' | 'delivery'

  const fetchOrders = async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    const token = localStorage.getItem('dd_token');
    try {
      const res = await fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setOrders(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchOrders();
    if (socket) {
      socket.on('order_status_updated', fetchOrders);
      socket.on('new_order', fetchOrders);
      socket.on('delivery_status_updated', fetchOrders);
      return () => {
        socket.off('order_status_updated', fetchOrders);
        socket.off('new_order', fetchOrders);
        socket.off('delivery_status_updated', fetchOrders);
      };
    }
  }, [isAuthenticated, socket]);

  const handleReorder = (order) => {
    for (const item of (order.items || [])) {
      addToCart({ name: item.name, basePrice: item.base_price, quantity: item.quantity, customization: item.customization });
    }
    addToast({ title: 'Order Copied to Cart', message: `Added ${order.items?.length || 1} items to cart`, type: 'success' });
    onNavigate('cart');
  };

  const handleReorderDelivery = (order) => {
    // Navigate to delivery with pre-populated cart intent
    addToast({ title: 'Reordering Delivery', message: 'Opening Delivery with your previous items', type: 'info' });
    onNavigate('delivery');
  };

  const cafeOrders = orders.filter(o => !o.order_type || o.order_type === 'dine_in' || o.order_type === 'cafe');
  const deliveryOrders = orders.filter(o => o.order_type === 'delivery');

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#fef6e9] border border-[#f5cb87] text-[#b45309] mx-auto flex items-center justify-center">
          <Coffee className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-[#24160f]">Sign In to View Orders</h2>
        <p className="text-[#5c4033] text-sm">Track your live smart queue status, view past specialty recipes, and reorder your favorites.</p>
        <button onClick={() => onNavigate('login')} className="px-6 py-3 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white font-bold text-xs shadow-sm">Sign In</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase text-[#b45309] tracking-wider font-bold">Live Queue & Past Roasts</span>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-[#24160f] mt-1">My Orders</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onNavigate('menu')} className="px-4 py-2 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
            <span>Café Order</span><ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onNavigate('delivery')} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
            <Bike className="w-3.5 h-3.5" /><span>Order Delivery</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-[#e8dfd5] p-1.5 rounded-2xl shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('cafe')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'cafe' ? 'bg-[#b45309] text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
        >
          <Coffee className="w-3.5 h-3.5" /> Café Orders
          {cafeOrders.length > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeTab === 'cafe' ? 'bg-white/20' : 'bg-stone-100'}`}>{cafeOrders.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'delivery' ? 'bg-blue-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
        >
          <Bike className="w-3.5 h-3.5" /> Delivery Orders
          {deliveryOrders.length > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeTab === 'delivery' ? 'bg-white/20' : 'bg-stone-100'}`}>{deliveryOrders.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#785b46] space-y-3">
          <div className="w-10 h-10 border-2 border-[#b45309] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono uppercase tracking-wider">Loading orders...</p>
        </div>
      ) : activeTab === 'cafe' ? (
        cafeOrders.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-[#e8dfd5] p-8 space-y-3 max-w-md mx-auto shadow-sm">
            <AlertCircle className="w-10 h-10 text-[#b45309] mx-auto" />
            <h3 className="text-base font-bold text-[#24160f]">No Café Orders Yet</h3>
            <p className="text-xs text-[#5c4033]">Order from the café portal or menu to track your queue position.</p>
            <button onClick={() => onNavigate('menu')} className="px-5 py-2.5 bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold rounded-xl mt-2 shadow-sm">Explore Menu</button>
          </div>
        ) : (
          <div className="space-y-4">
            {cafeOrders.map((ord) => (
              <div key={ord.id} className="bg-white border border-[#e8dfd5] hover:border-[#b45309] rounded-3xl p-5 sm:p-6 shadow-sm transition space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0e8df] pb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-lg font-mono font-black text-[#b45309]">#{ord.order_number}</span>
                    <span className="text-xs text-[#785b46]">{new Date(ord.created_at).toLocaleDateString()} at {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {ord.table_number ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        🪑 Table {ord.table_number} • Dine-In Reserved
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#faf7f2] text-[#785b46] border border-[#e8dfd5]">
                        🚶 Counter Pick-up
                      </span>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider font-mono self-start sm:self-auto ${statusStyle(ord.status)}`}>
                    {ord.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#5c4033]">
                  {(ord.items || []).map((i, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span><strong className="text-[#24160f]">{i.quantity}x</strong> {i.name}{i.customization?.size && <span className="text-[#785b46]"> ({i.customization.size}{i.customization.milk ? `, ${i.customization.milk}` : ''})</span>}</span>
                      <span className="font-mono text-[#b45309] font-bold">₹{i.item_total || i.itemTotal}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#f0e8df] flex flex-wrap items-center justify-between gap-3">
                  <span className="text-base font-black text-[#24160f] font-mono">Total: ₹{ord.total_amount}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onNavigate('order-detail', { orderId: ord.id })} className="px-3.5 py-2 rounded-xl bg-[#faf7f2] hover:bg-[#f4eee6] text-[#24160f] text-xs font-bold border border-[#e8dfd5] transition flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-[#b45309]" /><span>Live Tracking</span>
                    </button>
                    <button onClick={() => handleReorder(ord)} className="px-4 py-2 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                      <RefreshCw className="w-3.5 h-3.5" /><span>Reorder</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* DELIVERY ORDERS TAB */
        deliveryOrders.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-[#e8dfd5] p-8 space-y-3 max-w-md mx-auto shadow-sm">
            <Bike className="w-10 h-10 text-blue-500 mx-auto" />
            <h3 className="text-base font-bold text-[#24160f]">No Delivery Orders Yet</h3>
            <p className="text-xs text-[#5c4033]">Order coffee & food to your doorstep with live tracking.</p>
            <button onClick={() => onNavigate('delivery')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl mt-2 shadow-sm">Order Delivery</button>
          </div>
        ) : (
          <div className="space-y-4">
            {deliveryOrders.map((ord) => {
              const deliveryStatus = ord.delivery_status || 'placed';
              const addrObj = typeof ord.delivery_address === 'string' ? (() => { try { return JSON.parse(ord.delivery_address); } catch (_) { return {}; } })() : (ord.delivery_address || {});
              return (
                <div key={ord.id} className="bg-white border border-[#e8dfd5] hover:border-blue-300 rounded-3xl p-5 sm:p-6 shadow-sm transition space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0e8df] pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-lg font-mono font-black text-blue-700">#{ord.order_number}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"><Bike className="w-2.5 h-2.5" /> Delivery</span>
                      <span className="text-xs text-[#785b46]">{new Date(ord.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider font-mono self-start sm:self-auto ${statusStyle(deliveryStatus)}`}>
                      {deliveryStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {addrObj.address && (
                    <div className="flex items-start gap-2 text-xs text-[#785b46]">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" />
                      <span>{addrObj.address}{addrObj.apartment ? `, ${addrObj.apartment}` : ''}{addrObj.area ? `, ${addrObj.area}` : ''}, {addrObj.city}</span>
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-[#5c4033]">
                    {(ord.items || []).map((i, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span><strong className="text-[#24160f]">{i.quantity}x</strong> {i.name}</span>
                        <span className="font-mono text-blue-700 font-bold">₹{i.item_total || i.itemTotal}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[#f0e8df] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-base font-black text-[#24160f] font-mono">Total: ₹{ord.total_amount}</span>
                      {ord.delivery_fee > 0 && <span className="text-xs text-[#785b46] ml-2">(incl. ₹{ord.delivery_fee} delivery)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onNavigate('delivery-tracking', { orderId: ord.id })} className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 transition flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /><span>Track Order</span>
                      </button>
                      {(deliveryStatus === 'delivered' || deliveryStatus === 'completed') && (
                        <button onClick={() => handleReorderDelivery(ord)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                          <RefreshCw className="w-3.5 h-3.5" /><span>Reorder</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
