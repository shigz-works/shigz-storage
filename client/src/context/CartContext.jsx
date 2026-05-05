import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('selectionCart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('selectionCart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (section) => {
    setCartItems((prev) => {
      if (prev.find((item) => item.id === section.id)) return prev;
      return [...prev, section];
    });
  };

  const removeFromCart = (sectionId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== sectionId));
  };

  const clearCart = () => setCartItems([]);

  const reorderCart = (newItems) => setCartItems(newItems);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, reorderCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
