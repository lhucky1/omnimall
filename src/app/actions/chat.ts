
'use server';

import type { Conversation, ConversationWithDetails, Message, Product, UserProfile } from '@/types';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';

export async function getOrCreateConversation({ productId, sellerId }: { productId: string; sellerId: string; }): Promise<{ success: boolean; conversationId?: string; error?: string; }> {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'User not authenticated' };
    }
    const buyerId = user.id;

    if (buyerId === sellerId) {
        return { success: false, error: 'You cannot start a conversation with yourself.' };
    }

    try {
        const { data: existingConversation, error: fetchError } = await supabase
            .from('conversations')
            .select('id')
            .eq('product_id', productId)
            .eq('buyer_id', buyerId)
            .eq('seller_id', sellerId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
            throw fetchError;
        }

        if (existingConversation) {
            return { success: true, conversationId: existingConversation.id };
        }

        const { data: newConversation, error: insertError } = await supabase
            .from('conversations')
            .insert({
                product_id: productId,
                buyer_id: buyerId,
                seller_id: sellerId,
                buyer_deleted: false,
                seller_deleted: false,
            })
            .select('id')
            .single();

        if (insertError) {
            throw insertError;
        }
        
        if (!newConversation) {
            throw new Error("Failed to create conversation.");
        }

        const { data: refetchedConversation, error: refetchError } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', newConversation.id)
            .single();

        if (refetchError || !refetchedConversation) {
            throw new Error("Failed to confirm conversation creation.");
        }


        return { success: true, conversationId: refetchedConversation.id };
    } catch (error: any) {
        console.error('Error in getOrCreateConversation:', error);
        return { success: false, error: error.message };
    }
}

export async function sendMessage(conversationId: string, content: string): Promise<{ success: boolean, error?: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'User not authenticated' };
    }

    try {
        const { error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: user.id,
                content: content,
                is_read: false,
            });

        if (error) {
            throw error;
        }
        revalidatePath(`/chat/${conversationId}`);
        revalidatePath('/chat');
        return { success: true };
    } catch (error: any) {
        console.error('Error sending message:', error);
        return { success: false, error: error.message };
    }
}


export async function getMyConversations(): Promise<{ success: boolean; data?: ConversationWithDetails[]; error?: string; }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'User not authenticated.' };
    }

    try {
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select('*')
            .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

        if (error) throw error;
        if (!conversations) return { success: true, data: [] };

        const detailedConversations = await Promise.all(
            conversations.map(async (convo) => {
                const isUserBuyer = convo.buyer_id === user.id;

                if ((isUserBuyer && convo.buyer_deleted) || (!isUserBuyer && convo.seller_deleted)) {
                    return null;
                }
                
                const otherUserId = isUserBuyer ? convo.seller_id : convo.buyer_id;

                const [productRes, otherUserRes, lastMessageRes, unreadCountRes] = await Promise.all([
                    supabase.from('products').select('id, name, image_urls').eq('id', convo.product_id).single(),
                    supabase.from('profiles').select('uid, display_name, avatar_url').eq('uid', otherUserId).single(),
                    supabase.from('messages').select('content, created_at').eq('conversation_id', convo.id).order('created_at', { ascending: false }).limit(1).single(),
                    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('conversation_id', convo.id).eq('is_read', false).neq('sender_id', user.id)
                ]);

                if (productRes.error || otherUserRes.error) {
                    console.warn(`Skipping conversation ${convo.id} due to missing product or user.`);
                    return null;
                }

                return {
                    ...convo,
                    product: productRes.data as Product,
                    otherUser: otherUserRes.data as UserProfile,
                    unread_count: unreadCountRes.count || 0,
                    last_message_content: lastMessageRes.data?.content,
                    last_message_at: lastMessageRes.data?.created_at,
                };
            })
        );
        
        const validConversations = detailedConversations.filter((c): c is ConversationWithDetails => c !== null);

        validConversations.sort((a, b) => {
            const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return timeB - timeA;
        });

        return { success: true, data: validConversations };

    } catch (error: any) {
        console.error("Error in getMyConversations:", error);
        return { success: false, error: error.message };
    }
}


export async function deleteConversation(conversationId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'User not authenticated' };
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return { success: false, error: "Administrator client not configured. Cannot process request." };
    }

    try {
        const { data: conversation, error: fetchError } = await supabaseAdmin
            .from('conversations')
            .select('buyer_id, seller_id')
            .eq('id', conversationId)
            .single();

        if (fetchError) throw fetchError;

        const isBuyer = conversation.buyer_id === user.id;

        const updateData = isBuyer ? { buyer_deleted: true } : { seller_deleted: true };

        const { error: updateError } = await supabaseAdmin
            .from('conversations')
            .update(updateData)
            .eq('id', conversationId);

        if (updateError) throw updateError;
        
        revalidatePath('/chat');
        return { success: true };

    } catch (error: any) {
        console.error('Error deleting conversation:', error);
        return { success: false, error: error.message };
    }
}

export async function canAccessConversation(convoId: string, userId: string): Promise<boolean> {
  const supabase = createClient();

  const { data: convo, error } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id, buyer_deleted, seller_deleted')
      .eq('id', convoId)
      .single();

  if (error || !convo) return false;

  const isBuyer = userId === convo.buyer_id;
  const isSeller = userId === convo.seller_id;

  if (isBuyer && convo.buyer_deleted) return false;
  if (isSeller && convo.seller_deleted) return false;

  return isBuyer || isSeller;
}


export async function markConversationAsRead(conversationId: string): Promise<{ success: boolean, error?: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'User not authenticated.' };
    }

    try {
        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .neq('sender_id', user.id);

        if (error) throw error;
        
        revalidatePath('/chat');
        return { success: true };
    } catch(err: any) {
        console.error('Error marking conversation as read:', err);
        return { success: false, error: err.message };
    }
}
