
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Product, WishlistItem } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase';

interface WishlistContextType {
  wishlist: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const supabase = createClient();

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user) {
        setWishlist([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: wishlistItems, error } = await supabase
          .from('wishlist')
          .select('*, products(*, profiles(*))')
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }
        
        const products = wishlistItems.map(item => item.products).filter(Boolean) as Product[];
        setWishlist(products);
        
      } catch (error) {
        console.error('Error fetching wishlist:', error);
        toast({ title: "Error", description: "Could not fetch your wishlist.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [user, toast]);

  const addToWishlist = async (product: Product) => {
    if (!user) {
      toast({ title: "Please log in", description: "You need to be logged in to add to your wishlist.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from('wishlist').insert({ user_id: user.id, product_id: product.id });
    if (error) {
      console.error('Error adding to wishlist:', error);
      toast({ title: "Error", description: "Could not add item to wishlist.", variant: "destructive" });
    } else {
      setWishlist(prev => [...prev, product]);
      toast({ title: "Added to Wishlist", description: `${product.name} has been added to your wishlist.` });
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;

    const { error } = await supabase.from('wishlist').delete().match({ user_id: user.id, product_id: productId });
    if (error) {
      console.error('Error removing from wishlist:', error);
      toast({ title: "Error", description: "Could not remove item from wishlist.", variant: "destructive" });
    } else {
      const removedItem = wishlist.find(p => p.id === productId);
      setWishlist(prev => prev.filter(p => p.id !== productId));
      if (removedItem) {
        toast({ title: "Removed from Wishlist", description: `${removedItem.name} has been removed from your wishlist.`, variant: "destructive" });
      }
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
