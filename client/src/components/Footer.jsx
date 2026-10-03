import React from 'react';
import { Coffee, Heart, MapPin, Clock, Phone, Mail, Sparkles, Shield, Compass } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-white border-t border-[#e8dfd5] text-[#785b46] pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#e8dfd5]">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#b45309] flex items-center justify-center shadow-sm text-white">
                <Coffee className="w-5 h-5" />
              </div>
              <span className="font-display font-extrabold text-2xl text-[#24160f] tracking-tight">
                DAILY DRIP
              </span>
            </div>
            <p className="text-sm text-[#5c4033] max-w-sm leading-relaxed">
              "Your Coffee. Your Way." A modern smart café platform merging artisanal bean sourcing, precision extraction, and interactive cross-device digital experiences.
            </p>
            <div className="pt-2 flex flex-col gap-2 text-xs text-[#785b46]">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#b45309] shrink-0" />
                <span>74 Artisan Boulevard, Roasters District</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#b45309] shrink-0" />
                <span>Mon – Sun: 7:00 AM – 10:00 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#b45309] shrink-0" />
                <span>+91 98765 43210 / contact@dailydrip.cafe</span>
              </div>
            </div>
          </div>

          {/* Quick Experience Links */}
          <div>
            <h4 className="text-[#24160f] font-semibold text-sm mb-4 uppercase tracking-wider font-mono">
              Café Experience
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Home Landing
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('menu')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Explore Full Menu
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('build-coffee')} className="hover:text-[#b45309] transition text-[#5c4033] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#b45309]" />
                  Build Your Coffee
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('coffee-magic')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Coffee Magic Quiz
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('coffee-dna')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Coffee DNA & QR
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('passport')} className="hover:text-[#b45309] transition text-[#5c4033] flex items-center gap-1.5">
                  <Compass className="w-3 h-3 text-[#b45309]" />
                  Coffee Passport
                </button>
              </li>
            </ul>
          </div>

          {/* Connected Tech Links */}
          <div>
            <h4 className="text-[#24160f] font-semibold text-sm mb-4 uppercase tracking-wider font-mono">
              Smart Ecosystem
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('cafe')} className="hover:text-[#92400e] transition font-semibold text-[#b45309]">
                  Café Portal (Cross-Device)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('delivery')} className="hover:text-blue-600 transition text-[#5c4033] flex items-center gap-1.5">
                  🛵 Online Delivery
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('orders')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Smart Queue & Tracking
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('profile')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Customer Profile
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('staff')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Barista KDS Display
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Admin Analytics
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & About */}
          <div>
            <h4 className="text-[#24160f] font-semibold text-sm mb-4 uppercase tracking-wider font-mono">
              About & Trust
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Our Story & Beans
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Contact & Table Bookings
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('terms')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('login')} className="hover:text-[#b45309] transition text-[#5c4033]">
                  Staff / Customer Sign In
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#785b46] gap-4">
          <p>© 2026 DAILY DRIP SMART CAFÉ. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-[#c2410c] fill-[#c2410c] inline" />
            <span>for specialty coffee connoisseurs worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
