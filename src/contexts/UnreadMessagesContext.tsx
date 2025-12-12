
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase';

interface UnreadMessagesContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  fetchUnreadCount: () => void;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType | undefined>(undefined);

export const UnreadMessagesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const supabase = createClient();
    
    // First, get all conversations the user is part of.
    const { data: conversations, error: convosError } = await supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

    if (convosError || !conversations || conversations.length === 0) {
      if(convosError) console.error('Error fetching conversations for unread count:', convosError);
      setUnreadCount(0);
      return;
    }

    const conversationIds = conversations.map(c => c.id);

    // Then, count unread messages in those conversations.
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', user.id);

    if (countError) {
      console.error('Error fetching unread messages count:', countError);
      setUnreadCount(0);
    } else {
      setUnreadCount(count || 0);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const value = {
    unreadCount,
    setUnreadCount,
    fetchUnreadCount,
  };

  return (
    <UnreadMessagesContext.Provider value={value}>
      {children}
    </UnreadMessagesContext.Provider>
  );
};

export const useUnreadMessages = () => {
  const context = useContext(UnreadMessagesContext);
  if (context === undefined) {
    throw new Error('useUnreadMessages must be used within an UnreadMessagesProvider');
  }
  return context;
};
