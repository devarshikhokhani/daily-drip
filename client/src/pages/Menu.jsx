import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Search,
  Sparkles,
  Heart,
  Plus,
  Filter,
  Mic,
  AlertCircle
} from 'lucide-react';
import CustomizationModal from '../components/CustomizationModal';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Menu({ onNavigate, onOpenVoiceOrder, initialSearch = '' }) {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [favorites, setFavorites] = useState(new Set());
  const [selectedItemForCustom, setSelectedItemForCustom] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { addToast } = useSocket();

  useEffect(() => {
    fetch('/api/menu/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error(err));

    if (isAuthenticated) {
      const token = localStorage.getItem('dd_token');
      fetch('/api/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setFavorites(new Set(data.map(f => f.id)));
          }
        })
        .catch(err => console.error(err));
    }
  }, [isAuthenticated]);

  const fetchMenu = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.append('category', selectedCategory);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    fetch(`/api/menu?${params.toString()}`)
      .then(res => res.json())
      .then(data => setMenuItems(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMenu();
  }, [selectedCategory, searchQuery]);

  const toggleFavorite = async (item, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      addToast({
        title: 'Sign In Required',
        message: 'Please sign in to save your favorite drinks ❤️',
        type: 'alert'
      });
      onNavigate('login');
      return;
    }

    const token = localStorage.getItem('dd_token');
    const isFav = favorites.has(item.id);

    try {
      if (isFav) {
        await fetch(`/api/favorites/${item.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        addToast({ title: 'Removed', message: `Removed ${item.name} from favorites`, type: 'info' });
      } else {
        await fetch(`/api/favorites/${item.id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFavorites(prev => new Set([...prev, item.id]));
        addToast({ title: 'Favorited ❤️', message: `Added ${item.name} to your favorites!`, type: 'success' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase text-[#b45309] tracking-wider font-bold">
            Artisanal Roasts & Kitchen Craft
          </span>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#24160f] mt-1">
            Our Specialty Menu
          </h1>
          <p className="text-[#5c4033] text-sm mt-1">
            Precision crafted espresso, single origin brews, silky plant lattes, and artisan baked goods.
          </p>
        </div>

        {/* Voice Ordering Trigger */}
        <button
          onClick={onOpenVoiceOrder}
          className="px-4 py-2.5 rounded-2xl bg-[#fef6e9] hover:bg-[#fdeece] border border-[#f5cb87] text-[#b45309] text-xs font-bold transition flex items-center gap-2 self-start md:self-auto shadow-sm"
        >
          <Mic className="w-4 h-4 text-[#b45309] animate-pulse" />
          <span>Talk to Café (Voice Order)</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#785b46] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search drinks, roasts, ingredients, or countries (e.g. Vanilla, Ethiopia, Iced)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#e8dfd5] rounded-2xl text-sm text-[#24160f] placeholder:text-[#a89a8f] focus:outline-none focus:border-[#b45309] transition shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#785b46] hover:text-[#24160f] px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            selectedCategory === 'all'
              ? 'bg-[#b45309] text-white shadow-sm'
              : 'bg-white text-[#5c4033] hover:bg-[#faf7f2] border border-[#e8dfd5]'
          }`}
        >
          ☕ All Items
        </button>

        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === cat.slug
                ? 'bg-[#b45309] text-white shadow-sm'
                : 'bg-white text-[#5c4033] hover:bg-[#faf7f2] border border-[#e8dfd5]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      {loading ? (
        <div className="py-20 text-center text-[#785b46] space-y-3">
          <div className="w-10 h-10 border-2 border-[#b45309] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono uppercase tracking-wider">Loading specialty menu...</p>
        </div>
      ) : menuItems.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-[#e8dfd5] p-8 space-y-3 max-w-md mx-auto shadow-sm">
          <AlertCircle className="w-10 h-10 text-[#b45309] mx-auto" />
          <h3 className="text-base font-bold text-[#24160f]">No Drinks Found</h3>
          <p className="text-xs text-[#5c4033]">
            No items match your filter "{searchQuery}". Try searching for "Latte", "Espresso", or clear the filter.
          </p>
          <button
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            className="px-4 py-2 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold mt-2 shadow-sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const isFav = favorites.has(item.id);
            return (
              <div
                key={item.id}
                className="bg-white border border-[#e8dfd5] rounded-3xl overflow-hidden hover:border-[#b45309] transition duration-300 flex flex-col justify-between shadow-sm hover:shadow-md group"
              >
                <div>
                  <div className="relative h-48 overflow-hidden bg-[#faf7f2]">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />

                    {item.origin_country && (
                      <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs font-bold text-white border border-white/10 flex items-center gap-1">
                        <span>{item.origin_flag}</span>
                        <span>{item.origin_country}</span>
                      </span>
                    )}

                    <button
                      onClick={(e) => toggleFavorite(item, e)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-stone-600 hover:text-red-500 transition shadow-sm"
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-red-500' : ''}`} />
                    </button>

                    <div className="absolute bottom-3 right-3">
                      <span className="px-3 py-1 rounded-full bg-[#b45309] text-white font-bold text-sm shadow-sm font-mono">
                        ₹{item.base_price}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="text-lg font-bold text-[#24160f] group-hover:text-[#b45309] transition">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#5c4033] line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {(item.tags || []).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#faf7f2] text-[#5c4033] border border-[#e8dfd5]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-[#f0e8df] mt-4 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedItemForCustom(item)}
                    className="flex-1 py-2.5 rounded-xl bg-[#faf7f2] hover:bg-[#f4eee6] text-[#24160f] text-xs font-bold border border-[#e8dfd5] transition flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#b45309]" />
                    Customize
                  </button>
                  <button
                    onClick={() => {
                      addToCart({
                        menuItemId: item.id,
                        name: item.name,
                        basePrice: item.base_price,
                        quantity: 1,
                        customization: { size: 'Medium (360ml)' }
                      });
                      addToast({
                        title: 'Added to Cart',
                        message: `1x ${item.name} added (₹${item.base_price})`,
                        type: 'success'
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedItemForCustom && (
        <CustomizationModal
          item={selectedItemForCustom}
          isOpen={!!selectedItemForCustom}
          onClose={() => setSelectedItemForCustom(null)}
          onSaveDna={(dnaData) => {
            setSelectedItemForCustom(null);
            onNavigate('coffee-dna', { createData: dnaData });
          }}
        />
      )}
    </div>
  );
}
