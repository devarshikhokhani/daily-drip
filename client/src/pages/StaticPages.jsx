import React, { useState } from 'react';
import { Coffee, MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export function AboutPage({ onNavigate }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-xs font-mono uppercase text-amber-600 font-bold tracking-wider">
          Our Roastery & Philosophy
        </span>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-[#24160f]">
          Crafting "Your Coffee. Your Way."
        </h1>
        <p className="text-stone-600 text-sm max-w-2xl mx-auto leading-relaxed">
          Daily Drip was founded on a simple realization: coffee is deeply intimate. Your mood, energy curve, and palate change daily, yet traditional cafés force static recipes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-[#e8dfd5]">
          <img
            src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&auto=format&fit=crop"
            alt="Coffee Roasting"
            className="w-full h-80 object-cover"
          />
        </div>

        <div className="space-y-4 text-stone-600 text-sm leading-relaxed">
          <h3 className="text-2xl font-bold text-[#24160f]">Ethical Direct-Trade Sourcing</h3>
          <p>
            We partner directly with family estates across Sidama (Ethiopia), Huila (Colombia), Chikmagalur (India), and Uji (Kyoto). Every bean is hand-harvested at peak brix sugar density and roasted in micro-batches in our vintage cast-iron roaster.
          </p>
          <p>
            We believe that technology shouldn't replace the barista's touch; rather, it amplifies it. Our cross-device <strong className="text-[#24160f]">Café Portal</strong>, digital <strong className="text-[#24160f]">Coffee DNA</strong>, and <strong className="text-[#24160f]">Smart Queue</strong> allow true two-way collaboration between the customer and our lead roasters.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('menu')}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
            >
              Explore Our Roasts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const { addToast } = useSocket();

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    addToast({ title: 'Message Received', message: 'Our head barista will reply shortly!', type: 'success' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-2">
        <span className="text-xs font-mono uppercase text-amber-600 font-bold tracking-wider">
          Get in Touch
        </span>
        <h1 className="text-4xl font-display font-extrabold text-[#24160f]">
          Contact Daily Drip
        </h1>
        <p className="text-stone-500 text-sm max-w-md mx-auto">
          Inquiries, catering flights, private tasting sessions, or table inquiries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Info */}
        <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 space-y-6 shadow-md">
          <h3 className="text-xl font-bold text-[#24160f]">Roastery & Flagship Café</h3>

          <div className="space-y-4 text-xs text-stone-600">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#24160f] block">Address</strong>
                <span>74 Artisan Boulevard, Roasters District, Suite 101</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#24160f] block">Hours of Operation</strong>
                <span>Monday – Friday: 7:00 AM – 10:00 PM</span>
                <span className="block text-stone-400">Saturday – Sunday: 8:00 AM – 11:00 PM</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#24160f] block">Direct Line</strong>
                <span>+91 98765 43210</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#24160f] block">Concierge & Press</strong>
                <span>contact@dailydrip.cafe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 space-y-4 shadow-md">
          <h3 className="text-xl font-bold text-[#24160f]">Send Us a Message</h3>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-mono uppercase text-stone-500 block mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aria Chen"
                  className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-stone-500 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aria@example.com"
                  className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-stone-500 block mb-1">Message</label>
                <textarea
                  rows="3"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can our roastery team assist you?"
                  className="w-full bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-3 py-2 text-xs text-[#24160f] focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Message</span>
              </button>
            </form>
          ) : (
            <div className="py-8 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-base font-bold text-[#24160f]">Thank You!</h4>
              <p className="text-xs text-stone-500">Your message has been dispatched to our café manager.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6 text-stone-600 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold text-[#24160f]">Privacy Policy</h1>
      <p className="text-xs text-stone-400 font-mono">Last updated: October 2026</p>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-[#24160f]">1. Information We Collect</h3>
        <p>
          We store account information (name, email, encrypted password hash) and your café customization preferences, Coffee DNA identifiers, and order history on our persistent SQLite database.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-[#24160f]">2. Real-Time Data & Temporary Sessions</h3>
        <p>
          Temporary 4-digit Café World session codes and cup artwork are utilized exclusively to sync devices during your café visit. Expired sessions are cleaned automatically.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-[#24160f]">3. Cookies & Local Storage</h3>
        <p>
          We use localStorage solely to preserve your active JWT session token and non-critical cart items across tab reloads. We never sell your personal taste profiles or Coffee DNA to third-party advertising networks.
        </p>
      </section>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6 text-stone-600 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold text-[#24160f]">Terms of Service</h1>
      <p className="text-xs text-stone-400 font-mono">Effective: October 2026</p>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-[#24160f]">1. Smart Café Services</h3>
        <p>
          By accessing Daily Drip via desktop or mobile, you agree to place orders responsibly. Orders submitted to the live kitchen queue are prepared on demand.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-[#24160f]">2. Demo Payments</h3>
        <p>
          Where simulated or demo checkout payment options are displayed, no actual monetary transactions or credit card charges occur unless an explicit payment gateway is configured by management.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-[#24160f]">3. Intellectual Property</h3>
        <p>
          All trademarks, coffee recipes, Coffee DNA formulas, and cup graphics are the property of Daily Drip Smart Café.
        </p>
      </section>
    </div>
  );
}
