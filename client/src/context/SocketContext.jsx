import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected', 'connecting', 'disconnected'
  const [notifications, setNotifications] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast, timestamp: Date.now() };
    setToasts(prev => [newToast, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    // Connect to Socket.IO (uses relative origin so it works in both dev proxy and production)
    const socketInstance = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    socketInstance.on('connect_error', () => {
      setIsConnected(false);
      setConnectionStatus('reconnecting');
    });

    // Universal Order Ready Alert
    socketInstance.on('order_ready_alert', (data) => {
      addToast({
        title: `🎉 Order #${data.orderNumber} Ready!`,
        message: `Your coffee is freshly brewed at the counter!`,
        type: 'ready',
        duration: 8000
      });

      // Trigger Confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    });

    // Live Café Urgent Alert
    socketInstance.on('live_cafe_alert', (data) => {
      setActiveAlert(data);
      addToast({
        title: `🚨 ${data.title}`,
        message: data.message,
        type: 'alert',
        duration: 7000
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Fetch initial notifications
  const refreshNotifications = async () => {
    try {
      const token = localStorage.getItem('dd_token');
      const res = await fetch('/api/notifications', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    refreshNotifications();
  }, []);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      connectionStatus,
      notifications,
      refreshNotifications,
      activeAlert,
      setActiveAlert,
      toasts,
      addToast,
      removeToast
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
