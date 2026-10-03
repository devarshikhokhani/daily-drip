import React, { useState, useEffect } from 'react';
import { Activity, Clock, Flame } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function RushMeter({ variant = 'banner' }) {
  const [rush, setRush] = useState({
    activeCount: 1,
    level: 'not_busy',
    label: 'NOT BUSY',
    color: 'green',
    waitMinutes: 5
  });
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchRush = async () => {
    try {
      const res = await fetch('/api/orders/rush');
      if (res.ok) {
        const data = await res.json();
        setRush(data);
      }
    } catch (e) {
      console.error('Rush fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRush();
    const interval = setInterval(fetchRush, 15000);

    if (socket) {
      socket.on('order_status_updated', fetchRush);
      socket.on('new_order', fetchRush);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('order_status_updated', fetchRush);
        socket.off('new_order', fetchRush);
      }
    };
  }, [socket]);

  const getColorClasses = () => {
    if (rush.color === 'red') {
      return {
        badge: 'bg-red-50 text-red-800 border-red-200',
        dot: 'bg-red-500',
        text: 'text-red-700',
        card: 'bg-red-50/70 border-red-200'
      };
    }
    if (rush.color === 'orange') {
      return {
        badge: 'bg-amber-50 text-amber-900 border-amber-200',
        dot: 'bg-amber-500',
        text: 'text-amber-800',
        card: 'bg-amber-50/70 border-amber-200'
      };
    }
    return {
      badge: 'bg-[#edf6ed] text-[#1b5e20] border-[#c8e6c9]',
      dot: 'bg-[#4d6344]',
      text: 'text-[#2d4026]',
      card: 'bg-white border-[#e8dfd5]'
    };
  };

  const style = getColorClasses();

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${style.badge}`}>
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`}></span>
        </span>
        <span>{rush.label}</span>
        <span className="text-[#785b46] font-normal">| ~{rush.waitMinutes}m wait</span>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl p-5 border ${style.card} shadow-sm transition`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${style.badge} shadow-sm`}>
            <Flame className={`w-5 h-5 ${style.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-[#785b46] font-medium">
                Live Café Rush Meter
              </span>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`}></span>
              </span>
            </div>
            <h3 className={`text-base font-bold ${style.text} flex items-center gap-2 mt-0.5`}>
              {rush.color === 'green' && '🟢'}
              {rush.color === 'orange' && '🟠'}
              {rush.color === 'red' && '🔴'}
              {rush.label}
              <span className="text-xs text-[#5c4033] font-normal">
                ({rush.activeCount} active order{rush.activeCount !== 1 ? 's' : ''} in kitchen)
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="flex items-center gap-2 bg-[#faf7f2] px-3.5 py-2.5 rounded-2xl border border-[#e8dfd5]">
            <Clock className="w-4 h-4 text-[#b45309]" />
            <div>
              <span className="text-[#785b46] block text-[10px]">Estimated Wait</span>
              <span className="font-bold text-[#b45309]">{rush.waitMinutes} - {rush.waitMinutes + 4} min</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-[#faf7f2] px-3.5 py-2.5 rounded-2xl border border-[#e8dfd5]">
            <Activity className="w-4 h-4 text-[#4d6344]" />
            <div>
              <span className="text-[#785b46] block text-[10px]">Barista Capacity</span>
              <span className="font-bold text-[#24160f]">
                {rush.activeCount <= 2 ? 'Optimal' : rush.activeCount <= 5 ? 'Steady' : 'Peak Flow'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
