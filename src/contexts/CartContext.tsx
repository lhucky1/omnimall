
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { CartItem, Product } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);

  const getCartKey = () => {
    return user ? `cart_omnimall_${user.uid}` : 'cart_omnimall_guest';
  }

  // Effect to load cart from localStorage when user changes
  useEffect(() => {
    const cartKey = getCartKey();
    try {
        const storedCart = localStorage.getItem(cartKey);
        setCart(storedCart ? JSON.parse(storedCart) : []);
    } catch (error) {
        console.error("Could not load cart from localStorage", error);
        setCart([]);
    }
  }, [user]);

  // Effect to save cart to localStorage when it changes
  useEffect(() => {
    const cartKey = getCartKey();
    try {
      localStorage.setItem(cartKey, JSON.stringify(cart));
    } catch (error) {
      console.error("Could not save cart to localStorage", error);
    }
  }, [cart, user]);


  const addToCart = (product: Product, quantity: number = 1) => {
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
      // If item exists, update its quantity
      updateQuantity(product.id, existingItem.quantity + quantity);
    } else {
      // Otherwise, add new item to cart
      const cartProduct: CartItem = {
        ...product,
        quantity: quantity,
      };
      setCart(prevCart => [...prevCart, cartProduct]);
      toast({ title: "Added to Cart", description: `${product.name} has been added to your cart.` });
    }
  };

  const removeFromCart = (productId: string) => {
    const itemToRemove = cart.find(item => item.id === productId);
    if (itemToRemove) {
        toast({ title: "Item Removed", description: `${itemToRemove.name} has been removed from your cart.` });
    }
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    const cartKey = getCartKey();
    localStorage.removeItem(cartKey);
  };

  const itemCount = cart.length; // Count unique items, not total quantity
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    itemCount,
    cartTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

    