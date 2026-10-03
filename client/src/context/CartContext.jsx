import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('dd_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [tableNumber, setTableNumber] = useState(() => {
    return localStorage.getItem('dd_table') || '';
  });

  const [notes, setNotes] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('dd_cart', JSON.stringify(items));
    } catch (e) {}
  }, [items]);

  useEffect(() => {
    if (tableNumber) {
      localStorage.setItem('dd_table', tableNumber);
    }
  }, [tableNumber]);

  const addToCart = (item) => {
    setItems(prev => {
      // Check if identical item + customization already exists
      const existingIdx = prev.findIndex(i =>
        i.name === item.name &&
        JSON.stringify(i.customization || {}) === JSON.stringify(item.customization || {})
      );

      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx].quantity += (item.quantity || 1);
        copy[existingIdx].itemTotal = copy[existingIdx].basePrice * copy[existingIdx].quantity;
        return copy;
      } else {
        const qty = item.quantity || 1;
        const base = item.basePrice || item.price || 0;
        return [...prev, {
          ...item,
          basePrice: base,
          quantity: qty,
          itemTotal: base * qty
        }];
      }
    });
  };

  const removeFromCart = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, delta) => {
    setItems(prev => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      copy[index].quantity = newQty;
      copy[index].itemTotal = copy[index].basePrice * newQty;
      return copy;
    });
  };

  const clearCart = () => {
    setItems([]);
    setNotes('');
    localStorage.removeItem('dd_cart');
  };

  const subtotal = items.reduce((acc, item) => acc + (item.itemTotal || 0), 0);
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const total = subtotal + tax;
  const itemCount = items.reduce((acc, item) => acc + (item.quantity || 0), 0);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      tableNumber,
      setTableNumber,
      notes,
      setNotes,
      subtotal,
      tax,
      total,
      itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
