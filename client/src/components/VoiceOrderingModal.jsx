import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Search, Sparkles, Check, ArrowRight, X, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function VoiceOrderingModal({ isOpen, onClose, onSelectCustomization }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [matches, setMatches] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const recognitionRef = useRef(null);
  const { addToCart } = useCart();

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg('');
      };

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        processIntent(text);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone access denied. You can still type below!');
        } else {
          setErrorMsg('Speech recognition error. Please try again or type your order.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    // Fetch menu items for matching
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => setMenuItems(data))
      .catch(err => console.error(err));
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        setMatches([]);
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  // Analyze text and match with real menu items
  const processIntent = (query) => {
    const text = (query || transcript).toLowerCase();
    if (!text.trim()) return;

    const wantsCold = text.includes('cold') || text.includes('ice') || text.includes('iced') || text.includes('chilled');
    const wantsHot = text.includes('hot') || text.includes('warm') || text.includes('steaming');
    const wantsSweet = text.includes('sweet') || text.includes('caramel') || text.includes('vanilla') || text.includes('chocolate');
    const wantsLowSweet = text.includes('not too sweet') || text.includes('less sweet') || text.includes('no sugar') || text.includes('bitter');
    const wantsStrong = text.includes('strong') || text.includes('bold') || text.includes('espresso') || text.includes('intense');
    const wantsMatcha = text.includes('matcha') || text.includes('green tea');

    // Score all menu items
    const scored = menuItems.map(item => {
      let score = 0;
      const itemName = item.name.toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const tags = (item.tags || []).map(t => t.toLowerCase());

      if (wantsCold && (itemName.includes('cold') || itemName.includes('iced') || itemName.includes('nitro') || tags.includes('cold'))) score += 5;
      if (wantsHot && (itemName.includes('latte') || itemName.includes('cappuccino') || itemName.includes('espresso') || tags.includes('hot'))) score += 4;
      if (wantsStrong && (itemName.includes('espresso') || itemName.includes('ristretto') || itemName.includes('nitro') || tags.includes('bold'))) score += 5;
      if (wantsSweet && (itemName.includes('vanilla') || itemName.includes('mocha') || itemName.includes('caramel'))) score += 4;
      if (wantsLowSweet && (itemName.includes('espresso') || itemName.includes('cold brew') || itemName.includes('darjeeling'))) score += 4;
      if (wantsMatcha && itemName.includes('matcha')) score += 8;

      // Direct word matches
      const words = text.split(' ').filter(w => w.length > 2);
      for (const w of words) {
        if (itemName.includes(w)) score += 3;
        if (desc.includes(w)) score += 1;
      }

      return { item, score };
    });

    const topMatches = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.item);

    setMatches(topMatches.length > 0 ? topMatches : menuItems.slice(0, 3));
  };

  const handleMakeFirstOne = () => {
    if (matches.length > 0) {
      const top = matches[0];
      const custom = {
        size: 'Medium (360ml)',
        milk: 'Regular Dairy Milk',
        sweetness: transcript.toLowerCase().includes('not too sweet') ? 'Less (25%)' : 'Normal (50%)',
        temperature: transcript.toLowerCase().includes('cold') ? 'Iced' : 'Hot',
        flavor: 'Pure Coffee (No Flavor)',
        addOns: []
      };

      addToCart({
        menuItemId: top.id,
        name: top.name,
        basePrice: top.base_price,
        quantity: 1,
        customization: custom
      });

      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#e8dfd5] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 rounded-full bg-[#faf7f2] border border-[#e8dfd5]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 mx-auto flex items-center justify-center text-white shadow-lg mb-3">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-display font-bold text-[#24160f]">
            Talk to the Café
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            "I want something cold, not too sweet, and strong."
          </p>
        </div>

        {/* Speech input or Fallback text */}
        <div className="space-y-4">
          {speechSupported ? (
            <div className="flex flex-col items-center">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse ring-8 ring-red-900/40 scale-105'
                    : 'bg-amber-600 text-white hover:bg-amber-500 shadow-xl'
                }`}
              >
                {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
              <span className="text-xs font-mono mt-3 text-stone-300">
                {isListening ? '🎙️ Listening... speak now' : 'Tap microphone to speak'}
              </span>
            </div>
          ) : (
            <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Voice recognition not supported in this browser. Use smart text input below:</span>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-400 text-center">{errorMsg}</p>
          )}

          {/* Text input fallback / manual edit */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g., I want something cold, not too sweet, and strong"
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                processIntent(e.target.value);
              }}
              className="flex-1 bg-[#faf7f2] border border-[#e8dfd5] rounded-xl px-4 py-2.5 text-sm text-[#24160f] focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={() => processIntent(transcript)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition"
            >
              Match
            </button>
          </div>
        </div>

        {/* Matches results */}
        {matches.length > 0 && (
          <div className="mt-6 pt-5 border-t border-[#e8dfd5] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-600 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                I found {matches.length} matching drinks:
              </span>
              <button
                onClick={handleMakeFirstOne}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline"
              >
                MAKE IT THE FIRST ONE
              </button>
            </div>

            <div className="space-y-2">
              {matches.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-[#faf7f2] p-3 rounded-xl border border-[#e8dfd5] flex items-center justify-between hover:border-amber-400 transition cursor-pointer"
                  onClick={() => {
                    addToCart({
                      menuItemId: item.id,
                      name: item.name,
                      basePrice: item.base_price,
                      quantity: 1,
                      customization: { size: 'Medium (360ml)' }
                    });
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#24160f]">{item.name}</p>
                      <p className="text-xs text-stone-500 line-clamp-1">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-amber-400">₹{item.base_price}</span>
                    <span className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                      Add
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
