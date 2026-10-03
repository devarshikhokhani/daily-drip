import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Radio,
  Smartphone,
  Monitor,
  Flame,
  Snowflake,
  Send,
  Sparkles,
  Check,
  Copy,
  Coffee,
  Users,
  CheckCircle2,
  Clock,
  Palette,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import CupPreview from '../components/CupPreview';
import CupCanvas from '../components/CupCanvas';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getCafeJoinUrlAsync, getCafeJoinUrl } from '../utils/urlHelper';

export default function CafePortal({ onNavigate, initialCode = '', initialMode = '' }) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { socket, addToast } = useSocket();

  // Mode: 'world' (Laptop / Café Screen) or 'remote' (Customer Phone)
  const isJoinRoute = typeof window !== 'undefined' && window.location.pathname.includes('/cafe/join');
  const [viewMode, setViewMode] = useState(
    initialMode === 'remote' || isJoinRoute || (initialCode && initialCode.length > 0) ? 'remote' : 'world'
  );

  // Café Session state
  const [session, setSession] = useState(null);
  const [sessionCodeInput, setSessionCodeInput] = useState(initialCode || '4827');
  const [isConnectedToSession, setIsConnectedToSession] = useState(false);
  const [joinQrUrl, setJoinQrUrl] = useState('');
  const [joinFullUrl, setJoinFullUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  // Two-way shared coffee draft
  const [draft, setDraft] = useState({
    baseDrink: 'Artisan Smoked Hazelnut Latte',
    size: 'Large',
    milk: 'Oat',
    sweetness: 'Normal',
    temperature: 'Hot',
    flavor: 'Hazelnut',
    addOns: ['Extra Shot', 'Caramel'],
    tableNumber: 7
  });

  // Received cup drawing
  const [receivedCupDesign, setReceivedCupDesign] = useState(null);

  // Live order lifecycle status on mobile remote ('sent', 'preparing', 'ready')
  const [remoteOrderStatus, setRemoteOrderStatus] = useState(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Ref to track last notified order status to prevent duplicate notifications
  const lastNotifiedStatusRef = useRef(null);
  const isJoiningRef = useRef(false);

  // Generate QR code with guaranteed public network URL
  const generateQrForSession = async (code) => {
    try {
      setQrLoading(true);
      const joinUrl = await getCafeJoinUrlAsync(code);
      setJoinFullUrl(joinUrl);

      const qr = await QRCode.toDataURL(joinUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#24160f', light: '#ffffff' },
        errorCorrectionLevel: 'M'
      });
      setJoinQrUrl(qr);
    } catch (e) {
      console.error('QR generation error:', e);
      // Fallback
      const fallbackUrl = getCafeJoinUrl(code);
      setJoinFullUrl(fallbackUrl);
    } finally {
      setQrLoading(false);
    }
  };

  // Initialize or fetch active session on mount
  useEffect(() => {
    if (viewMode === 'world') {
      fetchActiveHostSession();
    } else {
      // Remote customer view
      const codeToJoin = initialCode || '4827';
      handleJoinByCode(codeToJoin);
    }
  }, [viewMode]);

  const fetchActiveHostSession = async () => {
    try {
      const res = await fetch('/api/cafe/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        if (data.session.currentDraft) {
          setDraft(data.session.currentDraft);
        }

        // Generate accurate QR code for this session
        await generateQrForSession(data.session.code);

        if (socket && !isConnectedToSession) {
          socket.emit('join_cafe_session', {
            sessionId: data.session.id,
            code: data.session.code,
            deviceType: 'world',
            userName: user?.name || 'Café World Display'
          });
          setIsConnectedToSession(true);
        }
      }
    } catch (e) {
      console.error('Session init error:', e);
    }
  };

  // Connect to a session by 4-digit code (from mobile remote view)
  const handleJoinByCode = async (codeToUse) => {
    const code = (codeToUse || sessionCodeInput || '').trim();
    if (!code || isJoiningRef.current) return;
    isJoiningRef.current = true;

    try {
      let res = await fetch(`/api/cafe/session/code/${encodeURIComponent(code)}`);
      let data = await res.json();
      if (!res.ok && (code.startsWith('sess_') || code.length > 5)) {
        res = await fetch(`/api/cafe/session/${encodeURIComponent(code)}`);
        data = await res.json();
      }
      if (!res.ok) {
        addToast({ title: 'Join Failed', message: data.error || 'Invalid café code', type: 'alert' });
        return;
      }

      setSession(data.session);
      if (data.session.currentDraft) {
        setDraft(data.session.currentDraft);
      }

      // Also generate QR link in case remote user wants to share
      generateQrForSession(data.session.code);

      if (socket) {
        socket.emit('join_cafe_session', {
          sessionId: data.session.id,
          code: data.session.code,
          deviceType: 'customer',
          userName: user?.name || 'Customer Phone'
        });
      }

      setIsConnectedToSession(true);
      addToast({
        title: 'Connected!',
        message: `Joined Café Session #${data.session.code}`,
        type: 'success',
        duration: 3500
      });
    } catch (e) {
      console.error('Join error:', e);
    } finally {
      isJoiningRef.current = false;
    }
  };

  // Socket.IO event listeners for real-time 2-way sync
  useEffect(() => {
    if (!socket) return;

    // Two-way coffee draft updates
    const handleDraftUpdate = ({ draft: newDraft, sourceDevice }) => {
      setDraft(newDraft);
      // ONLY notify on Café World screen when updated by the customer phone
      // Never spam the customer phone for their own actions
      if (viewMode === 'world' && sourceDevice === 'customer') {
        addToast({
          title: 'Two-Way Sync',
          message: '📱 Customer updated coffee configuration',
          type: 'info',
          duration: 2500
        });
      }
    };

    // Cup artwork received
    const handleNewCupDesign = ({ drawingData, artistName }) => {
      setReceivedCupDesign(drawingData);
      // ONLY notify on the Café World screen so the barista sees it
      if (viewMode === 'world') {
        addToast({
          title: '🎨 New Cup Art Received!',
          message: `Custom cup drawing from ${artistName}`,
          type: 'success',
          duration: 4000
        });
      }
    };

    // Device connection alerts - only show on Café World host screen
    const handleDeviceAlert = ({ message, deviceType }) => {
      if (viewMode === 'world' && deviceType === 'customer') {
        addToast({ title: 'Device Connected', message, type: 'info', duration: 3000 });
      }
      setSession(prev => prev ? { ...prev, connected_devices: (prev.connected_devices || 1) + 1 } : prev);
    };

    // Live order preparation status updates (deduplicated)
    const handleOrderStatus = (updatedOrder) => {
      if (!updatedOrder) return;
      const status = updatedOrder.status;
      if (!status || status === lastNotifiedStatusRef.current) return;
      lastNotifiedStatusRef.current = status;
      setRemoteOrderStatus(status);

      if (status === 'preparing') {
        addToast({
          title: '☕ Preparing',
          message: 'Your coffee is being crafted by the barista...',
          type: 'info',
          duration: 4000
        });
      } else if (status === 'ready') {
        addToast({
          title: '🎉 YOUR COFFEE IS READY!',
          message: `${draft.baseDrink} • Table ${updatedOrder.table_number || draft.tableNumber || 7}`,
          type: 'ready',
          duration: 8000
        });
        try {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        } catch (e) {}
      }
    };

    socket.on('live_draft_updated', handleDraftUpdate);
    socket.on('new_cup_design', handleNewCupDesign);
    socket.on('device_connected_alert', handleDeviceAlert);
    socket.on('session_order_updated', handleOrderStatus);

    return () => {
      socket.off('live_draft_updated', handleDraftUpdate);
      socket.off('new_cup_design', handleNewCupDesign);
      socket.off('device_connected_alert', handleDeviceAlert);
      socket.off('session_order_updated', handleOrderStatus);
    };
  }, [socket, viewMode, draft.baseDrink, draft.tableNumber]);

  // Update draft and broadcast immediately via socket
  const updateSharedDraft = (changes, sourceDevice = viewMode === 'world' ? 'world' : 'customer') => {
    const updated = { ...draft, ...changes };
    setDraft(updated);

    if (socket && session) {
      socket.emit('sync_live_draft', {
        sessionId: session.id,
        draft: updated,
        sourceDevice
      });
    }

    if (session) {
      fetch(`/api/cafe/session/${session.id}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: updated, sourceDevice })
      }).catch(e => console.error(e));
    }
  };

  // Mobile remote submits coffee order directly to café
  const handleSendToCafe = async () => {
    if (orderSubmitting) return;
    setOrderSubmitting(true);

    try {
      const orderPayload = {
        items: [
          {
            name: [
              draft.size && draft.size !== 'undefined' ? draft.size : null,
              draft.flavor && draft.flavor !== 'None' && draft.flavor !== 'undefined' ? draft.flavor : null,
              draft.baseDrink && draft.baseDrink !== 'undefined' ? draft.baseDrink : 'Craft Coffee'
            ].filter(Boolean).join(' ').trim() || 'Craft Specialty Coffee',
            basePrice: 185,
            quantity: 1,
            customization: draft
          }
        ],
        tableNumber: draft.tableNumber || 7,
        guestName: user?.name || 'Remote Customer',
        cafeSessionId: session?.id,
        cupDesignData: receivedCupDesign || null,
        notes: 'Placed via Live Café Portal'
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('dd_token') ? { 'Authorization': `Bearer ${localStorage.getItem('dd_token')}` } : {})
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (res.ok) {
        setRemoteOrderStatus('sent');
        addToast({
          title: '🔔 Sent to Café!',
          message: `Order #${data.order.order_number} received on café screen`,
          type: 'success',
          duration: 4000
        });
      } else {
        addToast({ title: 'Failed to Send', message: data.error, type: 'alert' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Barista updates status on the café world screen
  const handleBaristaStatus = async (status) => {
    if (!session) return;
    try {
      await fetch(`/api/cafe/session/${session.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, tableNumber: draft.tableNumber || 7 })
      });
      addToast({
        title: `Order: ${status.toUpperCase()}`,
        message: `Status updated to ${status} for Table ${draft.tableNumber || 7}`,
        type: 'info'
      });
    } catch (err) {
      console.error('Barista status update error:', err);
    }
  };

  const copyJoinLink = () => {
    if (!joinFullUrl) return;
    navigator.clipboard.writeText(joinFullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    addToast({ title: 'Link Copied', message: 'Join URL copied to clipboard', type: 'success' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Mode Switcher */}
      <div className="bg-white border border-[#e8dfd5] rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#faf7f2] border border-[#e8dfd5] flex items-center justify-center text-[#b45309]">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-display font-extrabold text-[#24160f]">
                Smart Café Portal
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#edf6ed] text-[#4d6344] border border-[#d2e4cf] uppercase">
                Live 2-Way Sync
              </span>
            </div>
            <p className="text-xs text-[#785b46]">
              Real-time cross-device pairing between Laptop/Table display and Customer Phone.
            </p>
          </div>
        </div>

        {/* View Mode Selector Tabs */}
        <div className="flex items-center bg-[#faf7f2] p-1.5 rounded-2xl border border-[#e8dfd5] shrink-0">
          <button
            onClick={() => setViewMode('world')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              viewMode === 'world'
                ? 'bg-[#24160f] text-white shadow-sm'
                : 'text-[#785b46] hover:text-[#24160f]'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Café World (Laptop)</span>
          </button>
          <button
            onClick={() => setViewMode('remote')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              viewMode === 'remote'
                ? 'bg-[#b45309] text-white shadow-sm'
                : 'text-[#785b46] hover:text-[#24160f]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Customer Remote (Phone)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODE 1: CAFÉ WORLD SCREEN (Laptop / Barista Display)     */}
      {/* ========================================================= */}
      {viewMode === 'world' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Pair Code & Real QR Card */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-left flex-1">
              <span className="text-xs font-mono uppercase text-[#b45309] font-bold tracking-wider">
                Instant Mobile Pairing
              </span>
              <div className="flex items-center justify-center md:justify-start gap-4">
                <div>
                  <span className="text-[10px] text-[#785b46] uppercase font-mono block">Join Code</span>
                  <span className="text-4xl sm:text-5xl font-mono font-black text-[#24160f] tracking-widest">
                    {session?.code || '4827'}
                  </span>
                </div>
                <div className="h-10 w-px bg-[#e8dfd5]"></div>
                <div>
                  <span className="text-[10px] text-[#785b46] uppercase font-mono block">Sync Status</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4d6344]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4d6344] animate-ping"></span>
                    {session?.connected_devices || 1} Device{session?.connected_devices === 1 ? '' : 's'} Active
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#5c4033] max-w-md">
                Scan with any phone camera or open the link below to pair your mobile directly with this café table.
              </p>

              {/* Direct clickable URL & Copy Button */}
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2">
                <button
                  type="button"
                  onClick={copyJoinLink}
                  className="px-3.5 py-2 rounded-xl border border-[#e8dfd5] bg-[#faf7f2] hover:bg-[#f4eee6] text-xs font-semibold text-[#5c4033] flex items-center gap-1.5 transition"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Join Link'}</span>
                </button>

                {joinFullUrl && (
                  <a
                    href={joinFullUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-900 flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                    <span>Open Mobile View</span>
                  </a>
                )}
              </div>

              {joinFullUrl && (
                <div className="text-[11px] font-mono text-stone-500 break-all pt-1">
                  URL: <span className="text-[#24160f] font-semibold">{joinFullUrl}</span>
                </div>
              )}
            </div>

            {/* QR Code Container */}
            <div className="bg-[#faf7f2] p-5 rounded-2xl shadow-sm border border-[#e8dfd5] shrink-0 text-center">
              {joinQrUrl ? (
                <img
                  src={joinQrUrl}
                  alt="Join Café Session QR Code"
                  className="w-44 h-44 mx-auto object-contain rounded-xl bg-white p-2 shadow-sm border border-[#e8dfd5]"
                />
              ) : qrLoading ? (
                <div className="w-44 h-44 flex flex-col items-center justify-center text-xs text-[#785b46] font-mono bg-white rounded-xl border border-[#e8dfd5]">
                  <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                  Generating QR...
                </div>
              ) : (
                <div className="w-44 h-44 flex flex-col items-center justify-center text-xs text-[#785b46] font-mono bg-white rounded-xl border border-[#e8dfd5]">
                  <div className="text-2xl mb-1">☕</div>
                  Start a session<br />to get QR
                </div>
              )}
              <span className="text-[11px] font-mono text-[#24160f] font-bold block mt-2.5">
                📷 Scan with Phone Camera
              </span>
            </div>
          </div>

          {/* Real-time Two-Way World Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Cup Preview with Live Art */}
            <div className="lg:col-span-6 bg-white border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#f0e8df] pb-4">
                <div>
                  <span className="text-xs font-mono uppercase text-[#b45309] font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Two-Way Shared Cup
                  </span>
                  <h3 className="text-xl font-bold text-[#24160f]">Live Coffee in Progress</h3>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-[#f4eee6] border border-[#e8dfd5] text-[#b45309] font-mono font-bold">
                  Table {draft.tableNumber || '07'}
                </span>
              </div>

              {/* Cup preview rendering custom touch artwork if available */}
              <div className="py-4 flex justify-center">
                <CupPreview
                  customization={{
                    baseDrink: draft.baseDrink,
                    size: draft.size,
                    milk: draft.milk,
                    temperature: draft.temperature,
                    flavor: draft.flavor,
                    addOns: draft.addOns
                  }}
                  cupDesign={receivedCupDesign}
                />
              </div>

              {/* Live Parameters Reflection */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-[#faf7f2] p-3 rounded-xl border border-[#e8dfd5]">
                  <span className="text-[#785b46] block text-[10px]">Drink</span>
                  <span className="font-bold text-[#24160f] truncate block">{draft.baseDrink}</span>
                </div>
                <div className="bg-[#faf7f2] p-3 rounded-xl border border-[#e8dfd5]">
                  <span className="text-[#785b46] block text-[10px]">Milk</span>
                  <span className="font-bold text-[#24160f]">{draft.milk}</span>
                </div>
                <div className="bg-[#faf7f2] p-3 rounded-xl border border-[#e8dfd5]">
                  <span className="text-[#785b46] block text-[10px]">Sweetness</span>
                  <span className="font-bold text-[#b45309]">{draft.sweetness}</span>
                </div>
                <div className="bg-[#faf7f2] p-3 rounded-xl border border-[#e8dfd5]">
                  <span className="text-[#785b46] block text-[10px]">Temp</span>
                  <span className="font-bold text-[#0284c7]">{draft.temperature}</span>
                </div>
              </div>

              {/* Prominent Cup Artwork Showcase */}
              {receivedCupDesign && (
                <div className="bg-[#fcfaf7] border border-[#e8dfd5] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#b45309] flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" />
                      Live Custom Cup Sleeve
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      ✓ Received from Phone
                    </span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-[#5c4031] bg-[#261912] flex justify-center p-1">
                    <img src={receivedCupDesign} alt="Custom Cup Sleeve Art" className="max-h-28 object-contain" />
                  </div>
                </div>
              )}
            </div>

            {/* Right: Barista Operations & Two-Way Controller */}
            <div className="lg:col-span-6 space-y-6">
              {/* Two-Way Temperature & Modifiers Control from Café World */}
              <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-4">
                <span className="text-xs font-mono uppercase text-[#b45309] font-bold">
                  Two-Way Temperature Control
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateSharedDraft({ temperature: 'Hot' }, 'world')}
                    className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                      draft.temperature === 'Hot'
                        ? 'bg-[#c2410c] text-white border-[#c2410c] shadow-sm'
                        : 'bg-[#faf7f2] text-[#5c4033] border-[#e8dfd5] hover:bg-[#f4eee6]'
                    }`}
                  >
                    <Flame className="w-4 h-4" />
                    <span>Hot Steamed (65°C)</span>
                  </button>

                  <button
                    onClick={() => updateSharedDraft({ temperature: 'Iced' }, 'world')}
                    className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                      draft.temperature === 'Iced'
                        ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm'
                        : 'bg-[#faf7f2] text-[#5c4033] border-[#e8dfd5] hover:bg-[#f4eee6]'
                    }`}
                  >
                    <Snowflake className="w-4 h-4" />
                    <span>Over Crystal Ice</span>
                  </button>
                </div>
              </div>

              {/* Barista Status Progression Station */}
              <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[#b45309] font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Barista Kitchen Controls
                  </span>
                  <span className="text-[10px] text-[#785b46] font-mono">Updates Customer Phone Instantly</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleBaristaStatus('preparing')}
                    className="py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition"
                  >
                    <Coffee className="w-4 h-4" />
                    <span>MARK PREPARING</span>
                  </button>

                  <button
                    onClick={() => handleBaristaStatus('ready')}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>MARK READY (BELL)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: CUSTOMER REMOTE SCREEN (Mobile View)             */}
      {/* ========================================================= */}
      {viewMode === 'remote' && (
        <div className="max-w-md mx-auto space-y-6 animate-in fade-in">
          {/* Join Café Header */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#b45309] font-bold">
                  {isConnectedToSession ? 'Paired Device' : 'Enter 4-Digit Code'}
                </span>
                <h3 className="text-lg font-bold text-[#24160f]">Customer Café Remote</h3>
              </div>
              <span className={`w-3 h-3 rounded-full ${isConnectedToSession ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
            </div>

            {/* Code Input */}
            {!isConnectedToSession ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={sessionCodeInput}
                  onChange={(e) => setSessionCodeInput(e.target.value.toUpperCase())}
                  placeholder="Code e.g. 4827"
                  className="flex-1 bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-4 py-2.5 text-center font-mono font-bold text-lg text-[#24160f] focus:outline-none focus:border-[#b45309]"
                />
                <button
                  onClick={() => handleJoinByCode(sessionCodeInput)}
                  className="px-5 py-2.5 bg-[#b45309] hover:bg-[#92400e] text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Join
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs bg-[#faf7f2] p-3 rounded-2xl border border-[#e8dfd5]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-[#24160f]">Paired with Session #{session?.code || '4827'}</span>
                </div>
                <span className="text-[10px] font-mono text-[#5c4033] bg-[#f4eee6] border border-[#e8dfd5] px-2 py-1 rounded-md">
                  Table {draft.tableNumber || 7}
                </span>
              </div>
            )}
          </div>

          {/* Live Order Lifecycle Feedback Banner */}
          {remoteOrderStatus && (
            <div className={`p-4 rounded-2xl border text-center transition-all ${
              remoteOrderStatus === 'ready'
                ? 'bg-[#edf6ed] border-[#a3d9a5] text-[#1b5e20] animate-bounce shadow-md'
                : remoteOrderStatus === 'preparing'
                ? 'bg-[#fef6e9] border-[#f5cb87] text-[#92400e] shadow-sm'
                : 'bg-[#faf7f2] border-[#e8dfd5] text-[#24160f]'
            }`}>
              <h4 className="text-sm font-bold">
                {remoteOrderStatus === 'ready' && '🎉 YOUR COFFEE IS READY!'}
                {remoteOrderStatus === 'preparing' && '☕ Your coffee is being prepared by the barista...'}
                {remoteOrderStatus === 'sent' && '🔔 ORDER SENT TO CAFÉ SCREEN!'}
              </h4>
              <p className="text-xs mt-1 text-[#5c4033]">
                {draft.baseDrink} • Table {draft.tableNumber || '07'}
              </p>
            </div>
          )}

          {/* Live Sweetness Control (Two-Way Sync Demonstration) */}
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono uppercase text-[#b45309] font-bold">
                🍯 Sweetness: {draft.sweetness}
              </span>
              <span className="text-[10px] text-[#785b46]">Syncs to Café screen</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['No Sugar', 'Less', 'Normal', 'Extra'].map((sw) => (
                <button
                  key={sw}
                  onClick={() => updateSharedDraft({ sweetness: sw }, 'customer')}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    draft.sweetness === sw
                      ? 'bg-[#b45309] text-white shadow-sm'
                      : 'bg-[#f4eee6] text-[#5c4033] hover:bg-[#eadecc]'
                  }`}
                >
                  {sw}
                </button>
              ))}
            </div>

            {/* Milk and Temperature quick choices */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f0e8df]">
              <div>
                <label className="text-[10px] font-mono text-[#785b46] block mb-1">MILK</label>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {['Oat', 'Regular'].map(m => (
                    <button
                      key={m}
                      onClick={() => updateSharedDraft({ milk: m }, 'customer')}
                      className={`p-1.5 rounded-lg font-semibold transition ${
                        draft.milk === m
                          ? 'bg-[#b45309] text-white shadow-sm'
                          : 'bg-[#f4eee6] text-[#5c4033] hover:bg-[#eadecc]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#785b46] block mb-1">TEMP</label>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {['Hot', 'Iced'].map(t => (
                    <button
                      key={t}
                      onClick={() => updateSharedDraft({ temperature: t }, 'customer')}
                      className={`p-1.5 rounded-lg font-semibold transition ${
                        draft.temperature === t
                          ? 'bg-[#b45309] text-white shadow-sm'
                          : 'bg-[#f4eee6] text-[#5c4033] hover:bg-[#eadecc]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Design Your Cup Touch Canvas */}
          <div className="space-y-2">
            <CupCanvas
              onSaveDesign={(drawingData, isManualSend = false) => {
                setReceivedCupDesign(drawingData);

                // If user tapped "SEND DESIGN", transmit to café world screen
                if (isManualSend && socket && session) {
                  socket.emit('transfer_cup_design', {
                    sessionId: session.id,
                    drawingData,
                    artistName: user?.name || 'Customer'
                  });

                  fetch(`/api/cafe/session/${session.id}/cup-design`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ drawingData, artistName: user?.name || 'Customer' })
                  }).catch(e => console.error(e));
                }
              }}
            />
          </div>

          {/* SEND TO CAFÉ BUTTON */}
          <div className="pt-2">
            <button
              onClick={handleSendToCafe}
              disabled={orderSubmitting}
              className="w-full py-4 rounded-2xl bg-[#b45309] hover:bg-[#92400e] text-white font-black text-sm shadow-md transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{orderSubmitting ? 'TRANSMITTING ORDER...' : 'SEND TO CAFÉ (TABLE 07)'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
