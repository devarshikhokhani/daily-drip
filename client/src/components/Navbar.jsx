import React, { useState } from 'react';
import {
  Coffee,
  ShoppingBag,
  Heart,
  User,
  Compass,
  Sparkles,
  Layers,
  Radio,
  Menu as MenuIcon,
  X,
  Bell,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Flame,
  Search,
  Bike
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';

export default function Navbar({ onNavigate, currentPage, onOpenSearch }) {
  const { user, logout, demoLogin, isAuthenticated, isStaff, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const { connectionStatus, notifications } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const primaryLinks = [
    { label: 'Home', path: 'home' },
    { label: 'Menu', path: 'menu' },
    { label: 'Café Portal', path: 'cafe', highlight: true },
    { label: 'Delivery', path: 'delivery', icon: Bike },
    { label: 'Staff KDS', path: 'staff', icon: Coffee }
  ];

  const moreLinks = [
    { label: 'Build Your Coffee', path: 'build-coffee', icon: Flame, desc: 'Interactive visual cup builder' },
    { label: 'Coffee Magic Quiz', path: 'coffee-magic', icon: Sparkles, desc: 'Personalized roast recommendation' },
    { label: 'Coffee DNA', path: 'coffee-dna', icon: Layers, desc: 'Flavor profile & personal QR' },
    { label: 'Coffee Passport', path: 'passport', icon: Compass, desc: 'World origin tasting log' },
    { label: 'My Orders & Tracking', path: 'orders', icon: ShoppingBag, desc: 'Live queue & courier updates' },
    { label: 'Admin Management', path: 'admin', icon: ShieldCheck, desc: 'Menu CRUD, tables & analytics' }
  ];

  const handleNav = (path) => {
    onNavigate(path);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setNotifDropdownOpen(false);
    setMoreDropdownOpen(false);
  };

  const isMoreActive = moreLinks.some(m => m.path === currentPage);

  return (
    <header className="sticky top-0 z-50 bg-[#faf6f0]/95 backdrop-blur-md border-b border-[#e8dfd5] shadow-xs">
      {/* Top micro-bar: Rush & Demo Switcher */}
      <div className="bg-[#f3ece2] px-4 py-1 text-xs border-b border-[#e5dad0] text-[#786455] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              connectionStatus === 'connected' ? 'bg-emerald-600' : 'bg-amber-600'
            }`}></span>
          </span>
          <span className="font-mono text-[11px] font-semibold text-[#5a4333]">
            {connectionStatus === 'connected' ? 'LIVE CAFÉ HUB CONNECTED' : 'CONNECTING...'}
          </span>
        </div>

        {/* Quick Demo Role Switcher for live presentations */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#846f60] hidden sm:inline text-[11px] font-medium">Demo Switcher:</span>
          <button
            onClick={() => demoLogin('customer')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
              user?.role === 'customer'
                ? 'bg-[#b45309] text-white shadow-xs'
                : 'bg-[#eadecb] text-[#4a321e] hover:bg-[#ded0be]'
            }`}
            title="Switch to Customer view"
          >
            👤 Customer
          </button>
          <button
            onClick={() => demoLogin('staff')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
              user?.role === 'staff'
                ? 'bg-[#15803d] text-white shadow-xs'
                : 'bg-[#eadecb] text-[#4a321e] hover:bg-[#ded0be]'
            }`}
            title="Switch to Barista view"
          >
            ☕ Barista
          </button>
          <button
            onClick={() => demoLogin('admin')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
              user?.role === 'admin'
                ? 'bg-[#7e22ce] text-white shadow-xs'
                : 'bg-[#eadecb] text-[#4a321e] hover:bg-[#ded0be]'
            }`}
            title="Switch to Admin view"
          >
            👑 Admin
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            onClick={() => handleNav('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#b45309] to-[#78350f] flex items-center justify-center shadow-md text-white group-hover:scale-105 transition">
              <Coffee className="w-5 h-5" />
              <div className="absolute -top-2 flex gap-0.5 justify-center">
                <span className="w-1 h-2 bg-amber-200/90 rounded-full steam-anim-1"></span>
                <span className="w-1 h-2.5 bg-amber-100 rounded-full steam-anim-2"></span>
                <span className="w-1 h-2 bg-amber-200/90 rounded-full steam-anim-3"></span>
              </div>
            </div>
            <div>
              <span className="font-display font-extrabold text-xl tracking-tight text-[#24160f] group-hover:text-[#b45309] transition">
                DAILY DRIP
              </span>
              <span className="hidden md:block text-[10px] tracking-wider text-[#92400e] uppercase font-bold font-mono">
                Your Coffee. Your Way.
              </span>
            </div>
          </div>

          {/* Clean Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {primaryLinks.map((item) => {
              const active = currentPage === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#f0e6d8] text-[#92400e] border border-[#dccfc0] shadow-xs'
                      : item.highlight
                      ? 'text-[#b45309] hover:bg-[#f6eee3] font-bold'
                      : item.path === 'delivery'
                      ? 'text-blue-700 hover:bg-blue-50 font-bold'
                      : item.path === 'staff'
                      ? 'text-emerald-700 hover:bg-emerald-50 font-bold'
                      : 'text-[#4a3528] hover:text-[#24160f] hover:bg-[#f4ece1]'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {item.label}
                  {item.highlight && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a] uppercase font-mono">
                      Live
                    </span>
                  )}
                </button>
              );
            })}

            {/* MORE ▾ Dropdown for secondary features */}
            <div className="relative">
              <button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition flex items-center gap-1 ${
                  isMoreActive
                    ? 'bg-[#f0e6d8] text-[#92400e] border border-[#dccfc0] shadow-xs'
                    : 'text-[#4a3528] hover:text-[#24160f] hover:bg-[#f4ece1]'
                }`}
              >
                <span>More</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white border border-[#e2d5c5] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 border-b border-[#f0e6d8] text-[10px] font-mono uppercase text-[#786455] font-bold">
                    Specialty Experiences
                  </div>
                  {moreLinks.map((item) => {
                    const Icon = item.icon;
                    const active = currentPage === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNav(item.path)}
                        className={`w-full text-left px-3.5 py-2.5 text-xs transition flex items-start gap-2.5 ${
                          active ? 'bg-[#fef6e9] text-[#b45309] font-bold' : 'text-[#4a3528] hover:bg-[#faf6f0]'
                        }`}
                      >
                        <div className="p-1 rounded-lg bg-[#faf7f2] border border-[#e8dfd5] text-[#b45309] mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-[#24160f] leading-snug">{item.label}</p>
                          <p className="text-[10px] text-[#786455] mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search */}
            <button
              onClick={onOpenSearch}
              className="p-2 text-[#5a4233] hover:text-[#24160f] hover:bg-[#f4ece1] rounded-xl transition"
              title="Search menu"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Cart Button */}
            <button
              onClick={() => handleNav('cart')}
              className="relative p-2 text-[#5a4233] hover:text-[#24160f] hover:bg-[#f4ece1] rounded-xl transition flex items-center"
              title="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#b45309] text-white font-black text-xs rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-xs">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 text-[#5a4233] hover:text-[#24160f] hover:bg-[#f4ece1] rounded-xl transition"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#e2d5c5] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-[#f0e6d8] flex justify-between items-center">
                    <span className="font-bold text-sm text-[#24160f]">Café Notifications</span>
                    <span className="text-xs text-[#b45309] font-mono">{notifications.length} recent</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#f7f2ea]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#786455]">
                        No notifications right now
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className="p-3 text-xs hover:bg-[#faf6f0]">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-[#24160f]">{n.title}</span>
                            <span className="text-[10px] text-[#786455] font-mono">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[#5a4333] mt-1">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Auth Dropdown */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-[#f4ece1] border border-[#e2d5c5] transition"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#b45309] text-white flex items-center justify-center font-bold text-xs">
                    {user?.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-[#24160f] max-w-[100px] truncate">
                    {user?.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#5a4233]" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e2d5c5] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-[#f0e6d8]">
                      <p className="text-[10px] text-[#786455] font-mono">Signed in as</p>
                      <p className="text-xs font-bold text-[#24160f] truncate">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-[#fef3c7] text-[#92400e] border border-[#fde68a] uppercase font-mono font-bold">
                        {user?.role}
                      </span>
                    </div>

                    <button
                      onClick={() => handleNav('profile')}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-[#4a3528] hover:bg-[#faf6f0] hover:text-[#24160f] flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-[#b45309]" />
                      My Café Profile
                    </button>

                    <button
                      onClick={() => handleNav('orders')}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-[#4a3528] hover:bg-[#faf6f0] hover:text-[#24160f] flex items-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4 text-[#b45309]" />
                      Order History & Tracking
                    </button>

                    <button
                      onClick={() => handleNav('passport')}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-[#4a3528] hover:bg-[#faf6f0] hover:text-[#24160f] flex items-center gap-2"
                    >
                      <Compass className="w-4 h-4 text-[#b45309]" />
                      Coffee Passport
                    </button>

                    <div className="border-t border-[#f0e6d8] my-1"></div>

                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleNav('login')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#4a3528] hover:text-[#24160f] hover:bg-[#f4ece1] transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNav('signup')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#b45309] hover:bg-[#92400e] text-white transition shadow-xs"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Mobile menu hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#5a4233] hover:text-[#24160f] rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Clean Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#faf6f0] border-b border-[#e8dfd5] px-4 pt-2 pb-6 space-y-1 divide-y divide-[#ede4d8]">
          <div className="space-y-1 pb-2">
            {primaryLinks.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold flex items-center justify-between ${
                  currentPage === item.path ? 'bg-[#b45309] text-white' : 'text-[#4a3528] hover:bg-[#f4ece1]'
                }`}
              >
                <span>{item.label}</span>
                {item.highlight && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] font-mono">
                    LIVE
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-2 space-y-1">
            <p className="px-3 text-[10px] font-mono uppercase text-[#786455] font-bold">More Features</p>
            {moreLinks.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    currentPage === item.path ? 'bg-[#fef6e9] text-[#b45309] font-bold' : 'text-[#4a3528] hover:bg-[#f4ece1]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#b45309]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
