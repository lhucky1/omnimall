
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { deleteConversation, getMyConversations } from '@/app/actions/chat';
import type { ConversationWithDetails } from '@/types';
import { Loader2, MessageSquare, Frown, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext';
import { createClient } from '@/lib/supabase';

function ConversationItem({ convo, onDelete }: { convo: ConversationWithDetails, onDelete: (id: string) => void }) {
    const isUnread = convo.unread_count > 0;
    return (
        <div className={cn("flex items-start gap-4 p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors relative", isUnread && "bg-primary/5")}>
            <Link href={`/chat/${convo.id}`} className="flex-grow flex items-start gap-4 overflow-hidden">
                <div className="relative h-14 w-14 rounded-full flex-shrink-0">
                    <Avatar className="h-14 w-14">
                        <AvatarImage src={convo.otherUser.avatar_url || ''} />
                        <AvatarFallback>{convo.otherUser.display_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                     {isUnread && (
                        <div className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                     )}
                </div>
                <div className="flex-grow overflow-hidden">
                    <div className="flex justify-between items-start">
                        <p className={cn("font-semibold truncate", isUnread && "text-primary")}>{convo.otherUser.display_name}</p>
                        {convo.last_message_at && (
                           <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true })}</p>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{convo.product.name}</p>
                    <p className={cn("text-sm text-muted-foreground truncate mt-1", isUnread && "font-bold text-foreground")}>
                        {convo.last_message_content || 'No messages yet.'}
                    </p>
                </div>
            </Link>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-9 w-9 flex-shrink-0">
                        <Trash2 className="h-5 w-5" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently hide the conversation from your view. The other user will still be able to see it. Are you sure?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(convo.id)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function MyChatsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const { setUnreadCount } = useUnreadMessages();

    const fetchAndSetConversations = useCallback(async () => {
        const result = await getMyConversations();
        if (result.success && result.data) {
            setConversations(result.data);
            const totalUnread = result.data.reduce((sum, convo) => sum + (convo.unread_count || 0), 0);
            setUnreadCount(totalUnread);
        } else {
            console.error("Failed to fetch conversations:", result.error);
        }
        setLoading(false);
    }, [setUnreadCount]);
    
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (user) {
            setLoading(true);
            fetchAndSetConversations();
        }
    }, [user, authLoading, router, fetchAndSetConversations]);
    
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase.channel('new_messages_for_user')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
                fetchAndSetConversations();
            })
            .subscribe();
        
        return () => { supabase.removeChannel(channel); };
    }, [fetchAndSetConversations]);

    const handleDelete = async (id: string) => {
        setConversations(prev => prev.filter(c => c.id !== id));
        
        const result = await deleteConversation(id);
        if (!result.success) {
            toast({ title: "Error", description: "Could not delete conversation. Please try again.", variant: "destructive" });
            setLoading(true);
            await fetchAndSetConversations();
        } else {
            toast({ title: "Chat Deleted", description: "The conversation has been deleted." });
        }
    };

    if (loading || authLoading) {
        return (
            <div className="flex flex-col h-full items-center justify-center bg-primary/5">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-primary/5">
             <header className="flex items-center justify-between gap-4 p-4 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <MessageSquare className="h-6 w-6 text-primary"/>
                    <h1 className="text-xl font-bold text-foreground">My Chats</h1>
                </div>
            </header>

            <div className="flex-1 bg-background rounded-t-3xl shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
                 <div className="h-full overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="text-center py-20 flex flex-col items-center justify-center h-full">
                            <Frown className="mx-auto h-24 w-24 text-muted-foreground" />
                            <h2 className="mt-4 text-2xl font-semibold">No Conversations Yet</h2>
                            <p className="mt-2 text-muted-foreground">Start a conversation with a seller to see it here.</p>
                        </div>
                    ) : (
                        <div>
                            {conversations.map(convo => (
                                <div key={convo.id}>
                                    <ConversationItem convo={convo} onDelete={handleDelete} />
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
}
