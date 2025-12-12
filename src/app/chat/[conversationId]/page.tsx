
"use client";

import { useEffect, useState, useRef, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import type { Conversation, Message, Product, UserProfile } from '@/types';
import { Loader2, ArrowLeft, Send, Check, Clock, AlertTriangle, CheckCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sendMessage, canAccessConversation, markConversationAsRead } from '@/app/actions/chat';
import Link from 'next/link';
import Image from 'next/image';
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext';

const supabase = createClient();

interface ConversationDetails {
    conversation: Conversation;
    product: Product;
    otherUser: UserProfile;
}

type UIMessage = Message & { 
    status?: 'sending' | 'sent' | 'read' | 'failed';
    isFirstInGroup?: boolean;
    isLastInGroup?: boolean;
};

const groupMessages = (messages: Message[], currentUserId: string | undefined): UIMessage[] => {
    if (!messages.length) return [];
    return messages.map((msg, index) => {
        const prevMsg = messages[index - 1];
        const nextMsg = messages[index + 1];
        const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id || (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 60000 * 5;
        const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id || (new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime()) > 60000 * 5;
        
        let status: UIMessage['status'] = 'read';
        if (msg.sender_id === currentUserId && msg.id?.toString().startsWith('temp-')) {
            // This is an optimistic update, status will be handled by the component
        } else if (msg.sender_id === currentUserId) {
            status = msg.is_read ? 'read' : 'sent';
        }

        return { ...msg, isFirstInGroup, isLastInGroup, status };
    });
};

function ChatPageContent() {
    const { conversationId } = useParams();
    const { user, loading: authLoading } = useAuth();
    const { fetchUnreadCount } = useUnreadMessages();
    const router = useRouter();

    const [details, setDetails] = useState<ConversationDetails | null>(null);
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading || authLoading) {
                setShowSlowLoadMessage(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [loading, authLoading]);
    
    const scrollToBottom = (behavior: 'smooth' | 'auto' = 'auto', force = false) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 150;

        if (force || isScrolledToBottom) {
             setTimeout(() => {
                container.scrollTo({ top: container.scrollHeight, behavior });
            }, 50);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const setupConversation = async () => {
            setLoading(true);
            const hasAccess = await canAccessConversation(conversationId as string, user.id);
            if (!hasAccess) {
                setAccessDenied(true);
                setLoading(false);
                return;
            }

            // Mark as read and fetch data in parallel
            await markConversationAsRead(conversationId as string);
            fetchUnreadCount(); // Update global count

            const { data: convoData, error: convoError } = await supabase.from('conversations').select('*, product:products(*), buyer:profiles!conversations_buyer_id_fkey(*), seller:profiles!conversations_seller_id_fkey(*)').eq('id', conversationId).single();
            if (convoError || !convoData) {
                console.error("Error fetching conversation details:", convoError);
                setAccessDenied(true);
                setLoading(false);
                return;
            }
            const otherUser = convoData.buyer_id === user.id ? convoData.seller : convoData.buyer;
            setDetails({ conversation: convoData, product: convoData.product, otherUser } as ConversationDetails);

            const { data: initialMessages, error: messagesError } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
            if (messagesError) console.error("Error fetching messages:", messagesError);
            else setMessages(groupMessages(initialMessages || [], user.id));
            
            setLoading(false);
            scrollToBottom('auto', true);
        };
        
        setupConversation();
        
        const channel = supabase.channel(`chat:${conversationId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
                async (payload) => {
                    const stillAllowed = await canAccessConversation(conversationId as string, user.id);
                    if (!stillAllowed) return;
                    const receivedMessage = payload.new as Message;
                    if (receivedMessage.sender_id !== user.id) {
                         setMessages(currentMessages => groupMessages([...currentMessages, { ...receivedMessage, status: 'read' }], user.id));
                         scrollToBottom('smooth');
                         await markConversationAsRead(conversationId as string);
                         fetchUnreadCount();
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };

    }, [conversationId, user, authLoading, router, fetchUnreadCount]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const content = newMessage.trim();
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: Message = { id: tempId, created_at: new Date().toISOString(), conversation_id: conversationId as string, sender_id: user.id, content: content, is_read: false };
        
        setMessages(current => groupMessages([...current, { ...optimisticMessage, status: 'sending' }], user.id));
        setNewMessage('');
        scrollToBottom('smooth', true);
        
        const result = await sendMessage(conversationId as string, content);
        
        if (result.success) {
             setMessages(current => current.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
        } else {
            console.error("Failed to send message:", result.error);
            setMessages(current => current.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
        }
    };

    if (loading || authLoading) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
            </div>
        );
    }

    if (accessDenied || !details) {
        return <div className="flex h-full items-center justify-center bg-background text-center p-4">
            <div>
                <h2 className="text-xl font-semibold">Access Denied</h2>
                <p className="text-muted-foreground">Conversation not found or you do not have permission to view it.</p>
                <Button asChild variant="link"><Link href="/chat">Back to Chats</Link></Button>
            </div>
        </div>;
    }
    
    const MessageStatusIndicator = ({ status }: { status: UIMessage['status'] }) => {
        if (status === 'sending') return <Clock className="h-3 w-3 text-primary-foreground/70" />;
        if (status === 'sent') return <Check className="h-4 w-4 text-primary-foreground/90" />;
        if (status === 'read') return <CheckCheck className="h-4 w-4 text-sky-400" />;
        if (status === 'failed') return <AlertTriangle className="h-4 w-4 text-destructive" />;
        return null;
    }

    return (
       <div className="flex flex-col h-full bg-secondary/30 dark:bg-zinc-900">
            <header className="flex items-center gap-2 p-3 z-10 shrink-0 border-b bg-background shadow-sm">
                <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 rounded-full" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                <Link href={`/sellers/${details.otherUser.uid}`} className="flex items-center gap-3 overflow-hidden">
                    <Avatar>
                        <AvatarImage src={details.otherUser.avatar_url || ''} />
                        <AvatarFallback>{details.otherUser.display_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow overflow-hidden">
                        <p className="font-semibold truncate text-foreground">{details.otherUser.display_name}</p>
                    </div>
                </Link>
            </header>
            
            <Link href={`/products/${details.product.id}`} className="p-2 bg-background border-b shadow-sm hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 max-w-2xl mx-auto">
                    <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
                        <Image
                            src={details.product.image_urls?.[0] || 'https://placehold.co/100x100.png'}
                            alt={details.product.name}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="flex-grow overflow-hidden">
                        <p className="font-semibold text-sm truncate">{details.product.name}</p>
                        <p className="text-xs text-muted-foreground">GHC {details.product.price.toFixed(2)}</p>
                    </div>
                </div>
            </Link>

            <main ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-0 space-y-1 min-h-0">
                {messages.map((msg) => {
                    const fromCurrentUser = msg.sender_id === user?.id;
                    return (
                        <div key={msg.id} className={cn("flex items-end gap-2 text-sm", fromCurrentUser ? 'justify-end' : 'justify-start', msg.isFirstInGroup ? 'mt-3' : 'mt-0.5')}>
                            <div className={cn(
                                "max-w-[75%] px-3 py-2 shadow-sm relative",
                                fromCurrentUser 
                                    ? 'bg-gradient-to-br from-primary to-orange-400 text-primary-foreground' 
                                    : 'bg-background text-foreground',
                                msg.isFirstInGroup && !fromCurrentUser && "rounded-tl-lg",
                                msg.isFirstInGroup && fromCurrentUser && "rounded-tr-lg",
                                msg.isLastInGroup && !fromCurrentUser && "rounded-bl-lg",
                                msg.isLastInGroup && fromCurrentUser && "rounded-br-lg",
                                "rounded-b-2xl rounded-t-2xl",
                            )}>
                                <p className="text-base break-words">{msg.content}</p>
                                <div className={cn("text-xs mt-1 flex items-center gap-1.5", fromCurrentUser ? 'text-primary-foreground/80 justify-end' : 'text-muted-foreground')}>
                                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                    {fromCurrentUser && <MessageStatusIndicator status={msg.status} />}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            <footer className="p-2 sm:p-3 bg-transparent shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-2xl mx-auto p-1.5 rounded-full bg-background border shadow-sm">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onFocus={() => scrollToBottom('smooth')}
                        placeholder="Type a message..."
                        autoComplete="off"
                        className="flex-1 h-10 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim()} className="rounded-full h-10 w-10 flex-shrink-0 bg-primary hover:bg-primary/90">
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </footer>
        </div>
    );
}

export default function ChatPage() {
    return (
        <div className="relative flex flex-col h-full sm:max-w-2xl sm:mx-auto sm:border-x">
            <ChatPageContent />
        </div>
    );
}

    