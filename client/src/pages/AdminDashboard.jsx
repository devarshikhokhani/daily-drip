import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Coffee,
  Users,
  Clock,
  Layers,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  MapPin,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const DEFAULT_TABLES = [
  { table_number: 1, capacity: 2, status: 'available', notes: 'Window seat with garden view' },
  { table_number: 2, capacity: 2, status: 'available', notes: 'Bar counter corner' },
  { table_number: 3, capacity: 4, status: 'available', notes: 'Center booth with charging outlets' },
  { table_number: 4, capacity: 4, status: 'available', notes: 'Oak wood square table' },
  { table_number: 5, capacity: 6, status: 'reserved', reserved_by: 'Evening Book Club', notes: 'Reserved at 6 PM' },
  { table_number: 6, capacity: 2, status: 'available', notes: 'Sunny quiet alcove' },
  { table_number: 7, capacity: 4, status: 'occupied', reserved_by: 'Demo Session', notes: 'Table 07 active' },
  { table_number: 8, capacity: 2, status: 'available', notes: 'Espresso bar stool' },
  { table_number: 9, capacity: 4, status: 'available', notes: 'Patio umbrella table' },
  { table_number: 10, capacity: 6, status: 'available', notes: 'Community work table' }
];

export default function AdminDashboard({ onNavigate }) {
  const { user, isAdmin } = useAuth();
  const { socket, addToast } = useSocket();

  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState(DEFAULT_TABLES);
  const [usersList, setUsersList] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('espresso');
  const [formPrice, setFormPrice] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formCountry, setFormCountry] = useState('Italy');
  const [formFlag, setFormFlag] = useState('🇮🇹');

  const fetchAdminData = async () => {
    const token = localStorage.getItem('dd_token');
    try {
      const [anRes, mRes, cRes, oRes, tRes, uRes, dRes] = await Promise.all([
        fetch('/api/analytics', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/menu?all=true'),
        fetch('/api/menu/categories'),
        fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/tables'),
        fetch('/api/analytics/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/delivery/all', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (anRes.ok) setAnalytics(await anRes.json());
      if (mRes.ok) setMenuItems(await mRes.json());
      if (cRes.ok) setCategories(await cRes.json());
      if (oRes.ok) setOrders(await oRes.json());
      if (tRes.ok) {
        const tabData = await tRes.json();
        if (Array.isArray(tabData) && tabData.length > 0) setTables(tabData);
      }
      if (uRes.ok) setUsersList(await uRes.json());
      if (dRes.ok) setDeliveryOrders(await dRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTableStatus = async (tableNumber, newStatus, reservedBy = null) => {
    const token = localStorage.getItem('dd_token');
    try {
      await fetch(`/api/tables/${tableNumber}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          reservedBy: newStatus === 'reserved' ? (reservedBy || 'VIP Guest') : (newStatus === 'occupied' ? 'Dine-In Guest' : null),
          notes: newStatus === 'available' ? null : undefined
        })
      });
      fetchAdminData();
      addToast({
        title: `Table ${tableNumber} Updated`,
        message: `Status set to ${newStatus.toUpperCase()}`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAdminData();

    if (socket) {
      socket.on('new_order', fetchAdminData);
      socket.on('order_status_updated', fetchAdminData);
      socket.on('menu_updated', fetchAdminData);
      socket.on('table_status_changed', fetchAdminData);

      return () => {
        socket.off('new_order');
        socket.off('order_status_updated');
        socket.off('menu_updated');
        socket.off('table_status_changed');
      };
    }
  }, [socket]);

  const handleOpenItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormName(item.name);
      setFormCategory(item.category_slug);
      setFormPrice(item.base_price);
      setFormDesc(item.description);
      setFormImage(item.image_url);
      setFormCountry(item.origin_country || 'Italy');
      setFormFlag(item.origin_flag || '🇮🇹');
    } else {
      setEditingItem(null);
      setFormName('');
      setFormCategory('espresso');
      setFormPrice('');
      setFormDesc('');
      setFormImage('https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600');
      setFormCountry('Italy');
      setFormFlag('🇮🇹');
    }
    setItemModalOpen(true);
  };

  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('dd_token');
    const payload = {
      name: formName,
      categorySlug: formCategory,
      basePrice: parseFloat(formPrice),
      description: formDesc,
      imageUrl: formImage,
      originCountry: formCountry,
      originFlag: formFlag
    };

    try {
      let res;
      if (editingItem) {
        res = await fetch(`/api/menu/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setItemModalOpen(false);
        fetchAdminData();
        addToast({ title: editingItem ? 'Item Updated' : 'Item Added', message: `${formName} saved to menu catalog`, type: 'success' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAvailability = async (item) => {
    const token = localStorage.getItem('dd_token');
    try {
      await fetch(`/api/menu/${item.id}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ available: !item.available })
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the menu?`)) return;
    const token = localStorage.getItem('dd_token');
    try {
      await fetch(`/api/menu/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      fetchAdminData();
      addToast({ title: 'Deleted', message: `${name} removed from menu`, type: 'info' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    const token = localStorage.getItem('dd_token');
    try {
      await fetch(`/api/analytics/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      fetchAdminData();
      addToast({ title: 'Role Updated', message: `User role changed to ${newRole}`, type: 'success' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateDeliveryStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('dd_token');
    try {
      const res = await fetch(`/api/delivery/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setDeliveryOrders(prev => prev.map(o => o.id === orderId ? { ...o, delivery_status: newStatus } : o));
        addToast({ title: 'Delivery Updated', message: `Order marked as ${newStatus}`, type: 'success' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <ShieldCheck className="w-12 h-12 text-purple-500 mx-auto" />
        <h2 className="text-2xl font-bold text-[#24160f]">Administrator Access Required</h2>
        <p className="text-stone-500 text-sm">
          Please sign in with administrator credentials (admin@dailydrip.cafe) to manage menus, analytics, tables, and staff.
        </p>
        <button
          onClick={() => onNavigate('login')}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
        >
          Sign In as Admin
        </button>
      </div>
    );
  }

  const summary = analytics?.summary || { totalOrders: 0, totalRevenue: 0, todayOrders: 0, todayRevenue: 0, activeOrders: 0, avgPrepTimeMin: 7 };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase text-purple-600 tracking-wider font-bold">
            Executive Café Operations
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-[#24160f] mt-1">
            Admin Management Console
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#e8dfd5] shadow-sm">
          {[
            { id: 'analytics', label: '📊 Analytics' },
            { id: 'menu', label: '☕ Menu CRUD' },
            { id: 'orders', label: '📋 Orders' },
            { id: 'tables', label: '🪑 Tables' },
            { id: 'users', label: '👥 Users' },
            { id: 'delivery', label: '🛵 Delivery' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-[#e8dfd5] shadow-md space-y-1">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">Today's Revenue</span>
              <span className="text-3xl font-black text-amber-600 font-mono">₹{summary.todayRevenue}</span>
              <span className="text-[11px] text-stone-400 block">Total Lifetime: ₹{summary.totalRevenue}</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#e8dfd5] shadow-md space-y-1">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">Today's Orders</span>
              <span className="text-3xl font-black text-[#24160f] font-mono">{summary.todayOrders}</span>
              <span className="text-[11px] text-stone-400 block">Lifetime: {summary.totalOrders} tickets</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#e8dfd5] shadow-md space-y-1">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">Active In Queue</span>
              <span className="text-3xl font-black text-emerald-600 font-mono">{summary.activeOrders}</span>
              <span className="text-[11px] text-stone-400 block">Avg Wait: ~{summary.avgPrepTimeMin} mins</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#e8dfd5] shadow-md space-y-1">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">Coffee DNA Created</span>
              <span className="text-3xl font-black text-sky-600 font-mono">{analytics?.users?.dnaCreations || 0}</span>
              <span className="text-[11px] text-stone-400 block">{analytics?.users?.registeredCustomers || 0} registered guests</span>
            </div>
          </div>

          {/* Charts & Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Hourly Order Trends Chart */}
            <div className="lg:col-span-7 bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-purple-600 font-bold">
                  Peak Service Hours (Orders & Demand)
                </span>
                <span className="text-[10px] text-stone-400 font-mono">Real database metrics</span>
              </div>

              <div className="h-56 flex items-end justify-between gap-2 pt-6">
                {(analytics?.hourlyTrends || []).map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[10px] font-mono text-amber-600 font-bold">{h.orders}</span>
                    <div
                      className="w-full bg-gradient-to-t from-purple-500 to-amber-400 rounded-t-lg transition-all duration-700"
                      style={{ height: `${Math.min(100, Math.max(15, h.orders * 22))}%` }}
                    ></div>
                    <span className="text-[9px] font-mono text-stone-400 whitespace-nowrap">{h.hour}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Drinks Table */}
            <div className="lg:col-span-5 bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-md space-y-4">
              <span className="text-xs font-mono uppercase text-amber-600 font-bold">
                Bestselling Drinks
              </span>

              <div className="space-y-3">
                {(analytics?.popularDrinks || []).map((drink, i) => (
                  <div key={i} className="flex items-center justify-between text-xs border-b border-[#e8dfd5] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-stone-400">#{i + 1}</span>
                      <span className="font-bold text-[#24160f]">{drink.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-amber-600 font-bold block">{drink.orderCount} sold</span>
                      <span className="text-[10px] text-stone-400">₹{drink.revenue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MENU CRUD */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-[#24160f]">Specialty Menu Catalog ({menuItems.length} items)</h3>
            <button
              onClick={() => handleOpenItemModal()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Item</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <div
                key={item.id}
                className="bg-white border border-[#e8dfd5] rounded-2xl p-4 shadow-md flex gap-4 items-start"
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-amber-600 uppercase">{item.category_slug}</span>
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        item.available
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {item.available ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-[#24160f] leading-tight">{item.name}</h4>
                  <span className="text-sm font-black text-amber-600 font-mono block">₹{item.base_price}</span>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => handleOpenItemModal(item)}
                      className="p-1.5 rounded-lg bg-[#faf7f2] text-stone-500 hover:text-stone-700 border border-[#e8dfd5]"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:text-red-700 border border-red-100"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#24160f]">All Café Orders ({orders.length})</h3>
          <div className="bg-white border border-[#e8dfd5] rounded-3xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-[#faf7f2] text-stone-500 font-mono uppercase text-[10px] border-b border-[#e8dfd5]">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Guest</th>
                    <th className="p-3">Table</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8dfd5]">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-[#faf7f2] transition">
                      <td className="p-3 font-mono font-bold text-amber-600">#{o.order_number}</td>
                      <td className="p-3 font-semibold text-[#24160f]">{o.guest_name}</td>
                      <td className="p-3">{o.table_number ? `T-${o.table_number}` : 'Counter'}</td>
                      <td className="p-3">{(o.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
                      <td className="p-3 font-mono font-bold text-amber-700">₹{o.total_amount}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase bg-stone-100 text-stone-600 border border-stone-200">
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-stone-400">{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TABLES */}
      {activeTab === 'tables' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xl font-bold text-[#24160f]">Café Floor Tables & Reservations</h3>
              <p className="text-xs text-stone-500">Live floor state and guest reservations management</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                🟢 {tables.filter(t => t.status === 'available').length} Available
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                🟡 {tables.filter(t => t.status === 'reserved').length} Reserved
              </span>
              <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                🔴 {tables.filter(t => t.status === 'occupied').length} Occupied
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {tables.map(t => (
              <div key={t.table_number} className="bg-white border border-[#e8dfd5] rounded-2xl p-4 shadow-md space-y-2.5 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-sm text-[#24160f]">Table {t.table_number < 10 ? `0${t.table_number}` : t.table_number}</span>
                    <span className="text-[10px] font-mono text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200">{t.capacity} Seats</span>
                  </div>

                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                    t.status === 'occupied'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : t.status === 'reserved'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {t.status === 'occupied' ? '🔴 OCCUPIED' : t.status === 'reserved' ? '🟡 RESERVED' : '🟢 AVAILABLE'}
                  </span>

                  {/* Reservation Details */}
                  {t.reserved_by && (
                    <div className="text-[11px] font-semibold text-[#b45309] bg-amber-50/60 p-1.5 rounded-lg border border-amber-100">
                      👤 {t.reserved_by}
                    </div>
                  )}

                  <p className="text-xs text-stone-500">{t.notes || 'General floor seating'}</p>

                  {t.activeOrder && (
                    <div className="pt-2 border-t border-[#e8dfd5] text-[11px] text-amber-800 space-y-0.5">
                      <p className="font-bold">Active Ticket #{t.activeOrder.order_number}</p>
                      <p className="text-[10px] text-stone-600">{t.activeOrder.guest_name} • ₹{t.activeOrder.total_amount}</p>
                      {t.activeOrder.items && (
                        <p className="text-[10px] text-stone-500 italic truncate">
                          {t.activeOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Switcher Buttons */}
                <div className="pt-2 border-t border-[#f0e8df] flex items-center gap-1 text-[10px] font-bold">
                  <button
                    onClick={() => handleUpdateTableStatus(t.table_number, 'available')}
                    className={`flex-1 py-1 rounded-lg border transition ${
                      t.status === 'available'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-[#faf7f2] text-stone-600 border-[#e8dfd5] hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    onClick={() => {
                      const guest = prompt(`Enter reservation name for Table ${t.table_number}:`, t.reserved_by || 'VIP Guest');
                      if (guest) handleUpdateTableStatus(t.table_number, 'reserved', guest);
                    }}
                    className={`flex-1 py-1 rounded-lg border transition ${
                      t.status === 'reserved'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-[#faf7f2] text-stone-600 border-[#e8dfd5] hover:bg-amber-50 hover:text-amber-700'
                    }`}
                  >
                    Reserve
                  </button>
                  <button
                    onClick={() => handleUpdateTableStatus(t.table_number, 'occupied')}
                    className={`flex-1 py-1 rounded-lg border transition ${
                      t.status === 'occupied'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-[#faf7f2] text-stone-600 border-[#e8dfd5] hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    Occupy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#24160f]">Registered Users & Role Control</h3>
          <div className="bg-white border border-[#e8dfd5] rounded-3xl overflow-hidden shadow-md">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-[#faf7f2] text-stone-500 font-mono uppercase text-[10px] border-b border-[#e8dfd5]">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Current Role</th>
                  <th className="p-3">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8dfd5]">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-[#faf7f2] transition">
                    <td className="p-3 font-semibold text-[#24160f] flex items-center gap-2">
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                      <span>{u.name}</span>
                    </td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="bg-[#faf7f2] border border-[#e8dfd5] rounded-lg px-2 py-1 text-xs text-[#24160f] focus:outline-none focus:border-amber-500"
                      >
                        <option value="customer">customer</option>
                        <option value="staff">staff</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Menu Item Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e8dfd5] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setItemModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 rounded-full bg-[#faf7f2] border border-[#e8dfd5]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#24160f] mb-4">
              {editingItem ? 'Edit Specialty Drink' : 'Add New Specialty Drink'}
            </h3>

            <form onSubmit={handleSaveMenuItem} className="space-y-3">
              <div>
                <label className="text-xs font-mono uppercase text-stone-500 block mb-1">Drink Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. Kyoto Slow Cold Drip"
                  className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase text-stone-500 block mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-500"
                  >
                    {categories.map(c => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-stone-500 block mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    required
                    placeholder="220"
                    className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-stone-500 block mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Flavor notes, extraction ritual, bean origin..."
                  className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-stone-500 block mb-1">Image URL</label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase text-stone-500 block mb-1">Passport Country</label>
                  <input
                    type="text"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    placeholder="Italy"
                    className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase text-stone-500 block mb-1">Flag Emoji</label>
                  <input
                    type="text"
                    value={formFlag}
                    onChange={(e) => setFormFlag(e.target.value)}
                    placeholder="🇮🇹"
                    className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-500 hover:text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: DELIVERY ORDERS */}
      {activeTab === 'delivery' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#24160f] font-mono uppercase">🛵 Delivery Orders ({deliveryOrders.length})</h3>
            <button onClick={fetchAdminData} className="text-xs text-purple-600 hover:underline flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
          {deliveryOrders.length === 0 ? (
            <div className="bg-white border border-[#e8dfd5] rounded-2xl p-10 text-center">
              <p className="text-sm text-[#785b46]">No delivery orders yet. Place an order from the Delivery page.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveryOrders.map(ord => (
                <div key={ord.id} className="bg-white border border-[#e8dfd5] rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-mono font-black text-[#b45309]">#{ord.order_number}</span>
                      <span className="text-xs text-[#785b46] ml-2">{ord.guest_name}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      ord.delivery_status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                      ord.delivery_status === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' :
                      ord.delivery_status === 'ready' ? 'bg-[#edf6ed] text-[#4d6344]' :
                      ord.delivery_status === 'preparing' ? 'bg-amber-100 text-amber-700' :
                      'bg-stone-100 text-stone-600'
                    }`}>{(ord.delivery_status || 'placed').replace(/_/g, ' ').toUpperCase()}</span>
                  </div>
                  {ord.delivery_address && (
                    <p className="text-xs text-[#785b46]">📍 {ord.delivery_address}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-[#f0e8df]">
                    <span className="text-xs font-mono font-bold">₹{ord.total_amount}</span>
                    <div className="flex gap-1 flex-wrap">
                      {(!ord.delivery_status || ord.delivery_status === 'placed') && (
                        <button onClick={() => handleUpdateDeliveryStatus(ord.id, 'accepted')} className="px-2 py-1 rounded-lg bg-sky-600 text-white text-[10px] font-bold">Accept</button>
                      )}
                      {ord.delivery_status === 'accepted' && (
                        <button onClick={() => handleUpdateDeliveryStatus(ord.id, 'preparing')} className="px-2 py-1 rounded-lg bg-[#b45309] text-white text-[10px] font-bold">Preparing</button>
                      )}
                      {ord.delivery_status === 'preparing' && (
                        <button onClick={() => handleUpdateDeliveryStatus(ord.id, 'ready')} className="px-2 py-1 rounded-lg bg-[#4d6344] text-white text-[10px] font-bold">Ready</button>
                      )}
                      {ord.delivery_status === 'ready' && (
                        <button onClick={() => handleUpdateDeliveryStatus(ord.id, 'out_for_delivery')} className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold">Out for Delivery</button>
                      )}
                      {ord.delivery_status === 'out_for_delivery' && (
                        <button onClick={() => handleUpdateDeliveryStatus(ord.id, 'delivered')} className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">Mark Delivered ✓</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
