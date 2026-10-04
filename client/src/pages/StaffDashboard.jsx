import React, { useState, useEffect } from 'react';
import {
  Coffee,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Send,
  ShieldCheck,
  Bike,
  Package,
  Sparkles,
  User as UserIcon,
  Edit3,
  X,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import RushMeter from '../components/RushMeter';

const DEFAULT_TABLES = [
  { table_number: 1, capacity: 2, status: 'available', notes: 'Window seat with garden view' },
  { table_number: 2, capacity: 2, status: 'available', notes: 'Bar counter corner with quick access' },
  { table_number: 3, capacity: 4, status: 'available', notes: 'Center booth with charging outlets' },
  { table_number: 4, capacity: 4, status: 'available', notes: 'Oak wood square table' },
  { table_number: 5, capacity: 6, status: 'reserved', reserved_by: 'Evening Book Club', notes: 'Reserved at 6 PM' },
  { table_number: 6, capacity: 2, status: 'available', notes: 'Sunny quiet alcove' },
  { table_number: 7, capacity: 4, status: 'occupied', reserved_by: 'Demo Session', notes: 'Table 07 - Demo Session Active' },
  { table_number: 8, capacity: 2, status: 'available', notes: 'Espresso bar stool' },
  { table_number: 9, capacity: 4, status: 'available', notes: 'Patio outdoor umbrella table' },
  { table_number: 10, capacity: 6, status: 'available', notes: 'Community work table' }
];

export default function StaffDashboard({ onNavigate }) {
  const { user, isStaff, demoLogin } = useAuth();
  const { socket, addToast } = useSocket();

  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState(DEFAULT_TABLES);
  const [editingTableModal, setEditingTableModal] = useState(null);
  const [modalReservedBy, setModalReservedBy] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'cafe' | 'delivery'
  const [loading, setLoading] = useState(true);

  // Emergency Alert Form State
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const fetchStaffData = async () => {
    const token = localStorage.getItem('dd_token');
    try {
      const [ordRes, tabRes, delRes] = await Promise.all([
        fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/tables'),
        fetch('/api/delivery/all', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(Array.isArray(ordData) ? ordData : []);
      }
      if (tabRes.ok) {
        const tabData = await tabRes.json();
        if (Array.isArray(tabData) && tabData.length > 0) {
          setTables(tabData);
        }
      }
      if (delRes.ok) {
        const delData = await delRes.json();
        setDeliveryOrders(Array.isArray(delData) ? delData : []);
      }
    } catch (e) {
      console.error('Fetch staff data error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();

    if (socket) {
      socket.emit('join_staff_room');

      socket.on('new_order', (newOrd) => {
        setOrders(prev => [newOrd, ...(Array.isArray(prev) ? prev : [])]);
        addToast({
          title: `🔔 NEW ORDER #${newOrd.order_number}`,
          message: `${newOrd.guest_name} placed an order for ₹${newOrd.total_amount}`,
          type: 'ready',
          duration: 5000
        });
      });

      socket.on('new_delivery_order', (newDel) => {
        setDeliveryOrders(prev => [newDel, ...(Array.isArray(prev) ? prev : [])]);
        addToast({
          title: `🛵 NEW DELIVERY #${newDel.order_number}`,
          message: `${newDel.guest_name} requested doorstep delivery`,
          type: 'ready',
          duration: 5000
        });
      });

      socket.on('order_status_updated', (updated) => {
        setOrders(prev => (Array.isArray(prev) ? prev : []).map(o => o.id === updated.id ? { ...o, ...updated } : o));
      });

      socket.on('delivery_status_updated', (updated) => {
        setDeliveryOrders(prev => (Array.isArray(prev) ? prev : []).map(o => o.id === updated.id ? { ...o, ...updated } : o));
      });

      socket.on('urgent_order_alert', ({ orderNumber, isUrgent }) => {
        addToast({
          title: isUrgent ? `🚨 URGENT ORDER #${orderNumber}` : `Cleared Urgency on #${orderNumber}`,
          message: isUrgent ? 'Kitchen prioritized this ticket' : 'Order urgency reset',
          type: 'alert'
        });
        fetchStaffData();
      });

      socket.on('table_status_changed', (data) => {
        if (data?.tableNumber) {
          setTables(prev => prev.map(t => t.table_number === data.tableNumber ? { ...t, ...data } : t));
          if (data.status === 'reserved') {
            addToast({
              title: `🪑 Table ${data.tableNumber} Reserved`,
              message: `Reserved for ${data.reservedBy || 'Café Guest'}`,
              type: 'info'
            });
          }
        }
        fetchStaffData();
      });

      return () => {
        socket.off('new_order');
        socket.off('new_delivery_order');
        socket.off('order_status_updated');
        socket.off('delivery_status_updated');
        socket.off('urgent_order_alert');
        socket.off('table_status_changed');
      };
    }
  }, [socket]);

  // Update café order status
  const handleUpdateStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('dd_token');
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        addToast({ title: 'Status Updated', message: `Order #${orderId} marked as ${newStatus}`, type: 'success' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update delivery order status
  const handleUpdateDeliveryStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('dd_token');
    try {
      const res = await fetch(`/api/delivery/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ delivery_status: newStatus })
      });
      if (res.ok) {
        setDeliveryOrders(prev => prev.map(o => o.id === orderId ? { ...o, delivery_status: newStatus } : o));
        addToast({ title: 'Delivery Updated', message: `Marked as ${newStatus.replace(/_/g, ' ')}`, type: 'success' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle order urgency
  const handleToggleUrgent = async (orderId) => {
    const token = localStorage.getItem('dd_token');
    try {
      await fetch(`/api/orders/${orderId}/urgent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStaffData();
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Table Status (Cycle: Available -> Reserved -> Occupied -> Available)
  const handleToggleTable = async (tableNumber, currentStatus) => {
    const nextStatus = currentStatus === 'available' ? 'reserved' : currentStatus === 'reserved' ? 'occupied' : 'available';
    const token = localStorage.getItem('dd_token');
    const defaultReservedBy = nextStatus === 'reserved' ? 'Barista Floor Reservation' : nextStatus === 'occupied' ? 'Dine-In Guest' : null;
    try {
      await fetch(`/api/tables/${tableNumber}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: nextStatus,
          reservedBy: defaultReservedBy
        })
      });
      fetchStaffData();
    } catch (e) {
      console.error(e);
    }
  };

  // Explicitly update reservation details from modal
  const handleSaveTableReservation = async (e) => {
    e.preventDefault();
    if (!editingTableModal) return;
    const token = localStorage.getItem('dd_token');
    try {
      await fetch(`/api/tables/${editingTableModal.table_number}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'reserved',
          reservedBy: modalReservedBy || 'Café Guest',
          notes: modalNotes || 'Reserved via Staff KDS'
        })
      });
      setEditingTableModal(null);
      fetchStaffData();
      addToast({
        title: `Table ${editingTableModal.table_number} Reserved`,
        message: `Reserved for ${modalReservedBy || 'Café Guest'}`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Release table back to available
  const handleFreeTable = async (tableNumber) => {
    const token = localStorage.getItem('dd_token');
    try {
      await fetch(`/api/tables/${tableNumber}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'available',
          reservedBy: null,
          notes: null
        })
      });
      if (editingTableModal?.table_number === tableNumber) {
        setEditingTableModal(null);
      }
      fetchStaffData();
      addToast({
        title: `Table ${tableNumber} Freed`,
        message: 'Table is now available for new guests',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Send Broadcast Alert
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!alertTitle || !alertMessage) return;
    const token = localStorage.getItem('dd_token');
    try {
      await fetch('/api/notifications/alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: alertTitle,
          message: alertMessage,
          type: 'alert'
        })
      });
      setAlertTitle('');
      setAlertMessage('');
      addToast({ title: 'Alert Broadcast', message: 'Sent to all connected customer devices', type: 'info' });
    } catch (e) {
      console.error(e);
    }
  };

  // If user is not logged in as staff, give instant demo access button
  if (!isStaff) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 mx-auto flex items-center justify-center shadow-sm">
          <Coffee className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#24160f]">Staff Kitchen Display (KDS)</h2>
          <p className="text-[#5c4033] text-sm mt-1">
            Live order board for Baristas & Kitchen Management. Switch to Barista mode to fulfill live orders and dispatch delivery couriers.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            onClick={async () => {
              await demoLogin('staff');
              fetchStaffData();
            }}
            className="w-full py-3.5 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <span>☕</span>
            <span>Instant 1-Click Barista Demo Access</span>
          </button>

          <button
            onClick={() => onNavigate('login')}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-[#faf7f2] text-[#5c4033] font-semibold text-xs border border-[#e8dfd5] transition"
          >
            Sign In with Custom Staff Credentials
          </button>
        </div>
      </div>
    );
  }

  // Combine safe orders list
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeDelivery = Array.isArray(deliveryOrders) ? deliveryOrders : [];

  // Build unified items list
  const combinedOrders = [
    ...safeOrders.map(o => ({
      ...o,
      isDelivery: o.order_type === 'delivery',
      displayStatus: o.order_type === 'delivery' ? (o.delivery_status || o.status || 'placed') : o.status
    })),
    ...safeDelivery.filter(d => !safeOrders.some(o => o.id === d.id)).map(d => ({
      ...d,
      isDelivery: true,
      displayStatus: d.delivery_status || d.status || 'placed'
    }))
  ];

  // Apply tab filter
  const displayedOrders = combinedOrders.filter(o => {
    if (orderFilter === 'cafe') return !o.isDelivery;
    if (orderFilter === 'delivery') return o.isDelivery;
    return true;
  });

  const cafeCount = combinedOrders.filter(o => !o.isDelivery).length;
  const deliveryCount = combinedOrders.filter(o => o.isDelivery).length;

  // 5 Status columns
  const newOrders = displayedOrders.filter(o => ['new', 'placed'].includes(o.displayStatus));
  const acceptedOrders = displayedOrders.filter(o => o.displayStatus === 'accepted');
  const preparingOrders = displayedOrders.filter(o => o.displayStatus === 'preparing');
  const readyOrders = displayedOrders.filter(o => o.displayStatus === 'ready');
  const completedOrders = displayedOrders.filter(o => ['completed', 'out_for_delivery', 'delivered'].includes(o.displayStatus)).slice(0, 15);

  const renderOrderCard = (order) => {
    const isDel = order.isDelivery || order.order_type === 'delivery';
    const status = order.displayStatus;

    return (
      <div
        key={`${order.isDelivery ? 'del' : 'cafe'}-${order.id}`}
        className={`p-4 rounded-2xl border transition-all space-y-3 shadow-sm ${
          order.is_urgent
            ? 'bg-red-50 border-red-300 ring-2 ring-red-400/50 animate-pulse'
            : isDel
            ? 'bg-blue-50/50 border-blue-200 hover:border-blue-400'
            : 'bg-white border-[#e8dfd5] hover:border-[#b45309]'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#f0e8df] pb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-mono font-black text-[#b45309]">
                #{order.order_number}
              </span>
              {isDel ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <Bike className="w-2.5 h-2.5" /> DELIVERY
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Coffee className="w-2.5 h-2.5" /> DINE-IN
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#785b46] block mt-0.5">
              {order.guest_name} • {order.table_number ? `Table ${order.table_number}` : (isDel ? 'Doorstep Delivery' : 'Counter Pickup')}
            </span>
          </div>

          <button
            onClick={() => handleToggleUrgent(order.id)}
            className={`p-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
              order.is_urgent
                ? 'bg-red-600 text-white'
                : 'bg-[#faf7f2] text-[#5c4033] hover:text-red-600 border border-[#e8dfd5]'
            }`}
            title="Toggle Urgent"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{order.is_urgent ? 'URGENT' : 'Flag'}</span>
          </button>
        </div>

        {/* Address if Delivery */}
        {isDel && order.delivery_address && (
          <div className="text-[10px] text-blue-800 bg-blue-100/60 p-1.5 rounded-lg border border-blue-200/60">
            📍 {typeof order.delivery_address === 'string' ? order.delivery_address : (order.delivery_address?.address || order.delivery_address?.city || 'Doorstep')}
          </div>
        )}

        {/* Items List */}
        <div className="space-y-1 text-xs">
          {(order.items || []).map((it, idx) => (
            <div key={idx} className="bg-[#faf7f2] p-2 rounded-lg border border-[#e8dfd5]">
              <p className="font-bold text-[#24160f] leading-tight">
                {it.quantity}x {it.name}
              </p>
              {it.customization && (
                <p className="text-[10px] text-[#5c4033] mt-0.5 leading-snug">
                  {it.customization.size && `${it.customization.size}`}
                  {it.customization.milk && ` • ${it.customization.milk}`}
                  {it.customization.sweetness && ` • ${it.customization.sweetness}`}
                  {it.customization.temperature && ` • ${it.customization.temperature}`}
                  {it.customization.addOns && it.customization.addOns.length > 0 && (
                    <span className="text-[#b45309] block font-medium">+ {it.customization.addOns.join(', ')}</span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Cup Design Attachment Preview if present */}
        {order.cup_design_data && (
          <div className="p-2 rounded-xl bg-[#faf7f2] border border-[#e8dfd5] text-center">
            <span className="text-[9px] font-mono uppercase text-[#b45309] font-bold block mb-1">
              Customer Cup Art
            </span>
            <img
              src={order.cup_design_data}
              alt="Cup Art"
              className="w-24 h-16 object-contain mx-auto rounded border border-[#e8dfd5] bg-white"
            />
          </div>
        )}

        {/* Total & Status Transition Buttons */}
        <div className="pt-2 border-t border-[#f0e8df] flex items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold text-[#24160f]">
            ₹{order.total_amount}
          </span>

          <div className="flex gap-1 flex-wrap justify-end">
            {/* DELIVERY WORKFLOW BUTTONS */}
            {isDel ? (
              <>
                {['new', 'placed'].includes(status) && (
                  <button
                    onClick={() => handleUpdateDeliveryStatus(order.id, 'accepted')}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold shadow-sm"
                  >
                    Accept
                  </button>
                )}
                {status === 'accepted' && (
                  <button
                    onClick={() => handleUpdateDeliveryStatus(order.id, 'preparing')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#b45309] hover:bg-[#92400e] text-white text-[11px] font-bold shadow-sm"
                  >
                    Start Brewing ☕
                  </button>
                )}
                {status === 'preparing' && (
                  <button
                    onClick={() => handleUpdateDeliveryStatus(order.id, 'ready')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white text-[11px] font-bold shadow-sm flex items-center gap-1"
                  >
                    <Package className="w-3 h-3" /> Pack & Ready
                  </button>
                )}
                {status === 'ready' && (
                  <button
                    onClick={() => handleUpdateDeliveryStatus(order.id, 'out_for_delivery')}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-sm flex items-center gap-1"
                  >
                    <Bike className="w-3 h-3" /> Dispatch 🛵
                  </button>
                )}
                {status === 'out_for_delivery' && (
                  <button
                    onClick={() => handleUpdateDeliveryStatus(order.id, 'delivered')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm"
                  >
                    Delivered ✓
                  </button>
                )}
              </>
            ) : (
              /* CAFÉ DINE-IN WORKFLOW BUTTONS */
              <>
                {status === 'new' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'accepted')}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold shadow-sm"
                  >
                    Accept
                  </button>
                )}
                {['new', 'accepted'].includes(status) && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'preparing')}
                    className="px-3 py-1.5 rounded-lg bg-[#b45309] hover:bg-[#92400e] text-white text-[11px] font-bold shadow-sm"
                  >
                    Preparing
                  </button>
                )}
                {status === 'preparing' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'ready')}
                    className="px-3 py-1.5 rounded-lg bg-[#4d6344] hover:bg-[#3b4c34] text-white text-[11px] font-bold shadow-sm"
                  >
                    Ready 🎉
                  </button>
                )}
                {status === 'ready' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'completed')}
                    className="px-3 py-1.5 rounded-lg bg-[#5c4033] hover:bg-[#3b271a] text-white text-[11px] font-bold shadow-sm"
                  >
                    Complete ✓
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase text-[#4d6344] tracking-wider font-bold flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5" />
            Kitchen Display System (KDS)
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-[#24160f] mt-1">
            Barista Live Order Board
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Order Channel Filter Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-[#e8dfd5] shadow-xs">
            <button
              onClick={() => setOrderFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                orderFilter === 'all'
                  ? 'bg-[#24160f] text-white shadow-xs'
                  : 'text-[#785b46] hover:text-[#24160f]'
              }`}
            >
              All ({combinedOrders.length})
            </button>
            <button
              onClick={() => setOrderFilter('cafe')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                orderFilter === 'cafe'
                  ? 'bg-[#b45309] text-white shadow-xs'
                  : 'text-[#785b46] hover:text-[#b45309]'
              }`}
            >
              <Coffee className="w-3 h-3" /> Café ({cafeCount})
            </button>
            <button
              onClick={() => setOrderFilter('delivery')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                orderFilter === 'delivery'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[#785b46] hover:text-blue-700'
              }`}
            >
              <Bike className="w-3 h-3" /> Delivery ({deliveryCount})
            </button>
          </div>

          <button
            onClick={fetchStaffData}
            className="px-3.5 py-2 bg-white hover:bg-[#faf7f2] text-[#24160f] text-xs font-bold rounded-xl border border-[#e8dfd5] flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#b45309]" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Live Rush Meter */}
      <RushMeter variant="banner" />

      {/* Tables Status Quick Overview */}
      <div className="bg-white border border-[#e8dfd5] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-mono uppercase text-[#b45309] font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Interactive Café Tables & Reservations Map
            </span>
            <p className="text-[11px] text-[#785b46] mt-0.5">
              Live floor occupancy • Click Cycle to change status or Edit to manage reservation details
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-[#edf6ed] text-[#1b5e20] border border-[#c8e6c9]">
              🟢 {tables.filter(t => t.status === 'available').length} Free
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
              🟡 {tables.filter(t => t.status === 'reserved').length} Reserved
            </span>
            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-300">
              🔴 {tables.filter(t => t.status === 'occupied').length} Occupied
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
          {tables.map((t) => {
            const isOcc = t.status === 'occupied';
            const isRes = t.status === 'reserved';
            const guestLabel = t.reserved_by || (t.activeOrder ? t.activeOrder.guest_name : null);
            return (
              <div
                key={t.table_number}
                className={`relative group rounded-2xl border p-2.5 flex flex-col justify-between transition shadow-xs hover:shadow-sm ${
                  isOcc
                    ? 'bg-red-50/80 border-red-200 text-red-900'
                    : isRes
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-[#edf6ed]/70 border-[#c8e6c9] text-[#1b5e20]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono font-black text-xs">
                      T-{t.table_number < 10 ? `0${t.table_number}` : t.table_number}
                    </span>
                    <span className="text-[9px] font-mono px-1 rounded bg-white/70 font-semibold text-[#5c4033]">
                      {t.capacity}p
                    </span>
                  </div>

                  <span className={`text-[9px] font-bold uppercase tracking-wider block font-mono px-1.5 py-0.5 rounded-md text-center ${
                    isOcc
                      ? 'bg-red-200/60 text-red-800'
                      : isRes
                      ? 'bg-amber-200/60 text-amber-800'
                      : 'bg-emerald-200/60 text-[#1b5e20]'
                  }`}>
                    {isOcc ? '🔴 Occupied' : isRes ? '🟡 Reserved' : '🟢 Free'}
                  </span>

                  {/* Reservation / Occupant info */}
                  <div className="mt-1.5 min-h-[30px] text-[10px] leading-tight">
                    {guestLabel ? (
                      <p className="font-bold truncate text-[#24160f] flex items-center gap-0.5" title={guestLabel}>
                        <UserIcon className="w-2.5 h-2.5 shrink-0 opacity-70" />
                        <span className="truncate">{guestLabel}</span>
                      </p>
                    ) : (
                      <p className="text-[#785b46]/70 italic text-[9px]">Open Table</p>
                    )}
                    {t.activeOrder && (
                      <p className="font-mono text-[9px] text-[#b45309] font-bold truncate">
                        #{t.activeOrder.order_number}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Action controls */}
                <div className="mt-2 pt-1.5 border-t border-black/5 flex items-center justify-between gap-1">
                  <button
                    onClick={() => handleToggleTable(t.table_number, t.status)}
                    title="Click to cycle status"
                    className="flex-1 text-[9px] font-bold py-1 px-1 rounded-lg bg-white/80 hover:bg-white text-[#24160f] border border-black/10 transition text-center truncate"
                  >
                    Cycle
                  </button>
                  <button
                    onClick={() => {
                      setEditingTableModal(t);
                      setModalReservedBy(t.reserved_by || '');
                      setModalNotes(t.notes || '');
                    }}
                    title="Manage Table Reservation"
                    className="p-1 rounded-lg bg-white/80 hover:bg-white text-[#b45309] border border-black/10 transition"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for Editing Table Reservation */}
      {editingTableModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e8dfd5] rounded-3xl max-w-sm w-full p-5 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0e8df] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#24160f] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#b45309]" />
                  Table {editingTableModal.table_number} Reservation
                </h3>
                <p className="text-[11px] text-[#785b46]">
                  Capacity: {editingTableModal.capacity} Seats • Status: {editingTableModal.status.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setEditingTableModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full bg-[#faf7f2] border border-[#e8dfd5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTableReservation} className="space-y-3">
              <div>
                <label className="text-xs font-mono uppercase text-[#785b46] font-bold block mb-1">
                  Reserved For / Guest Name
                </label>
                <input
                  type="text"
                  value={modalReservedBy}
                  onChange={(e) => setModalReservedBy(e.target.value)}
                  placeholder="e.g. Ariana, Book Club, Dr. Sharma"
                  className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-[#b45309]"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-[#785b46] font-bold block mb-1">
                  Reservation Notes & Time
                </label>
                <textarea
                  rows="2"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Arriving at 6:30 PM, window seating requested"
                  className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-[#b45309]"
                />
              </div>

              {editingTableModal.activeOrder && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-0.5">
                  <p className="font-bold">Active Ticket #{editingTableModal.activeOrder.order_number}</p>
                  <p>Guest: {editingTableModal.activeOrder.guest_name} • ₹{editingTableModal.activeOrder.total_amount}</p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#f0e8df]">
                <button
                  type="button"
                  onClick={() => handleFreeTable(editingTableModal.table_number)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 hover:bg-red-50 border border-red-200 transition"
                >
                  Clear Table
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingTableModal(null)}
                    className="px-3 py-2 rounded-xl text-xs text-stone-500 hover:text-stone-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white font-bold text-xs shadow-xs"
                  >
                    Save Reservation
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5-Column KDS Live Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. NEW / PLACED */}
        <div className="space-y-3">
          <div className="bg-[#faf7f2] p-3 rounded-2xl border border-[#e8dfd5] flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-bold text-sky-800">1. New Tickets</span>
            <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">
              {newOrders.length}
            </span>
          </div>
          <div className="space-y-3">
            {newOrders.length === 0 ? (
              <p className="text-xs text-[#785b46] text-center py-6">No new orders</p>
            ) : (
              newOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* 2. ACCEPTED */}
        <div className="space-y-3">
          <div className="bg-[#faf7f2] p-3 rounded-2xl border border-[#e8dfd5] flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-bold text-indigo-800">2. Accepted</span>
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              {acceptedOrders.length}
            </span>
          </div>
          <div className="space-y-3">
            {acceptedOrders.length === 0 ? (
              <p className="text-xs text-[#785b46] text-center py-6">No accepted tickets</p>
            ) : (
              acceptedOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* 3. PREPARING */}
        <div className="space-y-3">
          <div className="bg-[#faf7f2] p-3 rounded-2xl border border-[#e8dfd5] flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-bold text-[#b45309]">3. Brewing & Kitchen</span>
            <span className="w-5 h-5 rounded-full bg-[#b45309] text-white font-bold text-xs flex items-center justify-center">
              {preparingOrders.length}
            </span>
          </div>
          <div className="space-y-3">
            {preparingOrders.length === 0 ? (
              <p className="text-xs text-[#785b46] text-center py-6">Grinders idle</p>
            ) : (
              preparingOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* 4. READY */}
        <div className="space-y-3">
          <div className="bg-[#faf7f2] p-3 rounded-2xl border border-[#e8dfd5] flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-bold text-[#4d6344]">4. Ready / Packed 🎉</span>
            <span className="w-5 h-5 rounded-full bg-[#4d6344] text-white font-bold text-xs flex items-center justify-center">
              {readyOrders.length}
            </span>
          </div>
          <div className="space-y-3">
            {readyOrders.length === 0 ? (
              <p className="text-xs text-[#785b46] text-center py-6">No items awaiting pickup</p>
            ) : (
              readyOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* 5. DISPATCHED / COMPLETED */}
        <div className="space-y-3">
          <div className="bg-[#faf7f2] p-3 rounded-2xl border border-[#e8dfd5] flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-bold text-[#5c4033]">5. Dispatched / Done</span>
            <span className="w-5 h-5 rounded-full bg-[#5c4033] text-white font-bold text-xs flex items-center justify-center">
              {completedOrders.length}
            </span>
          </div>
          <div className="space-y-3">
            {completedOrders.length === 0 ? (
              <p className="text-xs text-[#785b46] text-center py-6">No dispatched items</p>
            ) : (
              completedOrders.map(renderOrderCard)
            )}
          </div>
        </div>
      </div>

      {/* Broadcast Café Alert Form */}
      <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#c2410c]" />
          <h3 className="text-base font-bold text-[#24160f]">Broadcast Live Café Announcement</h3>
        </div>
        <p className="text-xs text-[#5c4033]">
          Sends high-priority push banner to all connected mobile devices in the café.
        </p>

        <form onSubmit={handleSendBroadcast} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Alert Title (e.g. Fresh Batch Ethiopia Yirgacheffe Ready!)"
            value={alertTitle}
            onChange={(e) => setAlertTitle(e.target.value)}
            className="bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-4 py-2.5 text-xs text-[#24160f] focus:outline-none focus:border-[#c2410c]"
          />
          <input
            type="text"
            placeholder="Message details..."
            value={alertMessage}
            onChange={(e) => setAlertMessage(e.target.value)}
            className="bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-4 py-2.5 text-xs text-[#24160f] focus:outline-none focus:border-[#c2410c]"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Broadcast Alert</span>
          </button>
        </form>
      </div>
    </div>
  );
}
