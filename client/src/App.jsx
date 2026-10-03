import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider, useSocket } from './context/SocketContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import VoiceOrderingModal from './components/VoiceOrderingModal';

// Pages
import Home from './pages/Home';
import Menu from './pages/Menu';
import BuildCoffee from './pages/BuildCoffee';
import CoffeeMagic from './pages/CoffeeMagic';
import CoffeeDna from './pages/CoffeeDna';
import Passport from './pages/Passport';
import CafePortal from './pages/CafePortal';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Profile from './pages/Profile';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { AboutPage, ContactPage, PrivacyPage, TermsPage } from './pages/StaticPages';
import Delivery from './pages/Delivery';
import DeliveryTracking from './pages/DeliveryTracking';

// Mobile Bottom Navigation (visible only on small screens)
function MobileBottomNav({ currentPage, onNavigate }) {
  const tabs = [
    { key: 'home', label: 'Home', emoji: '🏠' },
    { key: 'menu', label: 'Menu', emoji: '☕' },
    { key: 'delivery', label: 'Delivery', emoji: '🛵' },
    { key: 'orders', label: 'Orders', emoji: '📦' },
    { key: 'profile', label: 'Profile', emoji: '👤' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-[#faf7f2]/97 backdrop-blur-md border-t border-[#e8dfd5] shadow-2xl">
      <div className="flex items-center justify-around px-2 py-1.5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onNavigate(tab.key)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition min-w-0 flex-1 ${
              currentPage === tab.key
                ? tab.key === 'delivery' ? 'text-blue-700 bg-blue-50' : 'text-[#b45309] bg-[#fef6e9]'
                : 'text-[#785b46] hover:text-[#b45309]'
            }`}
          >
            <span className="text-lg leading-none">{tab.emoji}</span>
            <span className="text-[10px] font-bold truncate">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// Toast Container Component
function ToastContainer() {
  const { toasts, removeToast } = useSocket();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-md transition transform animate-in slide-in-from-bottom-3 ${
            toast.type === 'ready'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
              : toast.type === 'alert'
              ? 'bg-red-950/90 border-red-500 text-red-200'
              : toast.type === 'success'
              ? 'bg-amber-950/90 border-amber-500 text-amber-200'
              : 'bg-[#1e140e]/95 border-[#3b271a] text-stone-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono">{toast.title}</h4>
              <p className="text-xs text-stone-300 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-stone-400 hover:text-white text-xs ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper to get initial route synchronously from window.location
function getRouteFromLocation() {
  if (typeof window === 'undefined') return { page: 'home', params: {} };
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(window.location.search);

  if (path === '/' || path === '') {
    return { page: 'home', params: {} };
  } else if (path === '/menu') {
    return { page: 'menu', params: { search: searchParams.get('search') || '' } };
  } else if (path === '/build' || path === '/build-coffee') {
    return { page: 'build-coffee', params: {} };
  } else if (path === '/magic' || path === '/coffee-magic') {
    return { page: 'coffee-magic', params: {} };
  } else if (path.startsWith('/coffee-dna/')) {
    const id = path.replace('/coffee-dna/', '');
    return { page: 'coffee-dna', params: { dnaId: id } };
  } else if (path === '/coffee-dna' || path === '/dna') {
    return { page: 'coffee-dna', params: {} };
  } else if (path === '/passport') {
    return { page: 'passport', params: {} };
  } else if (path.startsWith('/cafe/join/')) {
    const code = path.replace('/cafe/join/', '').split('?')[0];
    return { page: 'cafe', params: { code: code || searchParams.get('code') || '4827', mode: 'remote' } };
  } else if (path.startsWith('/join/')) {
    const code = path.replace('/join/', '').split('?')[0];
    return { page: 'cafe', params: { code: code || searchParams.get('code') || '4827', mode: 'remote' } };
  } else if (path === '/cafe/join' || path === '/join') {
    return { page: 'cafe', params: { code: searchParams.get('code') || '4827', mode: 'remote' } };
  } else if (path === '/cafe') {
    return {
      page: 'cafe',
      params: {
        code: searchParams.get('code') || '',
        mode: searchParams.get('mode') || (searchParams.get('code') ? 'remote' : '')
      }
    };
  } else if (path === '/cart' || path === '/checkout') {
    return { page: 'cart', params: {} };
  } else if (path.startsWith('/orders/')) {
    const id = path.replace('/orders/', '');
    return { page: 'order-detail', params: { orderId: id } };
  } else if (path === '/orders') {
    return { page: 'orders', params: {} };
  } else if (path === '/profile') {
    return { page: 'profile', params: {} };
  } else if (path === '/staff' || path === '/kds' || path === '/barista') {
    return { page: 'staff', params: {} };
  } else if (path === '/admin') {
    return { page: 'admin', params: {} };
  } else if (path === '/login' || path === '/signin') {
    return { page: 'login', params: {} };
  } else if (path === '/signup' || path === '/register') {
    return { page: 'signup', params: {} };
  } else if (path === '/forgot-password') {
    return { page: 'forgot-password', params: {} };
  } else if (path === '/reset-password') {
    return { page: 'reset-password', params: { token: searchParams.get('token') || '' } };
  } else if (path === '/about') {
    return { page: 'about', params: {} };
  } else if (path === '/contact') {
    return { page: 'contact', params: {} };
  } else if (path === '/privacy') {
    return { page: 'privacy', params: {} };
  } else if (path === '/terms') {
    return { page: 'terms', params: {} };
  } else if (path === '/delivery') {
    return { page: 'delivery', params: {} };
  } else if (path.startsWith('/delivery/orders/')) {
    const ordId = path.replace('/delivery/orders/', '');
    return { page: 'delivery-tracking', params: { orderId: ordId } };
  }
  return { page: 'home', params: {} };
}

// Router & App Shell
function AppContent() {
  const initialRoute = getRouteFromLocation();
  const [currentPage, setCurrentPage] = useState(initialRoute.page);
  const [routeParams, setRouteParams] = useState(initialRoute.params);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // Sync state with browser location pathname
  const parsePath = () => {
    const route = getRouteFromLocation();
    setCurrentPage(route.page);
    setRouteParams(route.params);
  };

  useEffect(() => {
    parsePath();

    const handlePopState = () => {
      parsePath();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page, params = {}) => {
    setCurrentPage(page);
    setRouteParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let newUrl = '/';
    if (page === 'menu') newUrl = '/menu';
    else if (page === 'build-coffee') newUrl = '/build-coffee';
    else if (page === 'coffee-magic') newUrl = '/coffee-magic';
    else if (page === 'coffee-dna') newUrl = params.dnaId ? `/coffee-dna/${params.dnaId}` : '/coffee-dna';
    else if (page === 'passport') newUrl = '/passport';
    else if (page === 'cafe') newUrl = params.code ? `/cafe/join?code=${params.code}` : '/cafe';
    else if (page === 'cart') newUrl = '/cart';
    else if (page === 'orders') newUrl = '/orders';
    else if (page === 'order-detail') newUrl = `/orders/${params.orderId}`;
    else if (page === 'profile') newUrl = '/profile';
    else if (page === 'staff') newUrl = '/staff';
    else if (page === 'admin') newUrl = '/admin';
    else if (page === 'login') newUrl = '/login';
    else if (page === 'signup') newUrl = '/signup';
    else if (page === 'forgot-password') newUrl = '/forgot-password';
    else if (page === 'reset-password') newUrl = params.token ? `/reset-password?token=${params.token}` : '/reset-password';
    else if (page === 'about') newUrl = '/about';
    else if (page === 'contact') newUrl = '/contact';
    else if (page === 'privacy') newUrl = '/privacy';
    else if (page === 'terms') newUrl = '/terms';
    else if (page === 'delivery') newUrl = '/delivery';
    else if (page === 'delivery-tracking') newUrl = `/delivery/orders/${params.orderId}`;

    window.history.pushState({}, '', newUrl);
  };

  // Keyboard shortcut Ctrl+K / Cmd+K for quick voice or menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setVoiceModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf7f2] text-[#24160f]">
      <Navbar
        onNavigate={navigateTo}
        currentPage={currentPage}
        onOpenSearch={() => navigateTo('menu')}
      />

      {/* Mobile bottom nav spacer — prevents content being hidden behind bottom nav */}
      <main className="flex-1 pb-16 sm:pb-0">
        {currentPage === 'home' && (
          <Home
            onNavigate={navigateTo}
            onOpenVoiceOrder={() => setVoiceModalOpen(true)}
          />
        )}
        {currentPage === 'menu' && (
          <Menu
            onNavigate={navigateTo}
            onOpenVoiceOrder={() => setVoiceModalOpen(true)}
            initialSearch={routeParams.search || ''}
          />
        )}
        {currentPage === 'build-coffee' && (
          <BuildCoffee
            onNavigate={navigateTo}
            initialPreset={routeParams}
          />
        )}
        {currentPage === 'coffee-magic' && (
          <CoffeeMagic
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'coffee-dna' && (
          <CoffeeDna
            onNavigate={navigateTo}
            dnaId={routeParams.dnaId}
            initialCreateData={routeParams.createData}
          />
        )}
        {currentPage === 'passport' && (
          <Passport
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'cafe' && (
          <CafePortal
            onNavigate={navigateTo}
            initialCode={routeParams.code}
            initialMode={routeParams.mode}
          />
        )}
        {currentPage === 'cart' && (
          <Cart
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'orders' && (
          <Orders
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'order-detail' && (
          <OrderDetail
            orderId={routeParams.orderId}
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'profile' && (
          <Profile
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'staff' && (
          <StaffDashboard
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'admin' && (
          <AdminDashboard
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'login' && (
          <Login
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'signup' && (
          <Signup
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'forgot-password' && (
          <ForgotPassword
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'reset-password' && (
          <ResetPassword
            onNavigate={navigateTo}
            initialToken={routeParams.token}
          />
        )}
        {currentPage === 'about' && (
          <AboutPage
            onNavigate={navigateTo}
          />
        )}
        {currentPage === 'contact' && (
          <ContactPage />
        )}
        {currentPage === 'privacy' && (
          <PrivacyPage />
        )}
        {currentPage === 'terms' && (
          <TermsPage />
        )}
        {currentPage === 'delivery' && (
          <Delivery onNavigate={navigateTo} />
        )}
        {currentPage === 'delivery-tracking' && (
          <DeliveryTracking onNavigate={navigateTo} orderId={routeParams.orderId} />
        )}
      </main>

      <Footer onNavigate={navigateTo} />

      {/* Voice Assistant Modal */}
      <VoiceOrderingModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onSelectCustomization={(drink) => {
          navigateTo('build-coffee', drink);
        }}
      />

      {/* Global Toast Alerts */}
      <ToastContainer />

      {/* Mobile Bottom Navigation — phone-friendly tab bar */}
      <MobileBottomNav currentPage={currentPage} onNavigate={navigateTo} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </CartProvider>
    </AuthProvider>
  );
}
