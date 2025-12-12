
"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const supabase = createClient();

type LiveNotificationData = {
    id: string;
    title: string;
    message: string;
    link?: string | null;
    link_text?: string | null;
};

export default function LiveNotification() {
    const { user } = useAuth();
    const [notification, setNotification] = useState<LiveNotificationData | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    const fetchNotification = async () => {
        if (!user) {
            setNotification(null);
            setIsVisible(false);
            return;
        }

        const { data, error } = await supabase
            .from('live_notifications')
            .select('*')
            .eq('is_active', true)
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is not an error here
            console.error("Error fetching notification:", error);
            return;
        }

        if (data) {
            const dismissed = localStorage.getItem(`dismissed_notification_${data.id}`);
            if (!dismissed) {
                setNotification(data);
                setIsVisible(true);
            }
        } else {
            setNotification(null);
            setIsVisible(false);
        }
    };
    
    useEffect(() => {
        fetchNotification();

        const channel = supabase.channel('live_notifications_channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'live_notifications' },
                (payload) => {
                    fetchNotification();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const handleDismiss = () => {
        if (notification) {
            localStorage.setItem(`dismissed_notification_${notification.id}`, 'true');
        }
        setIsVisible(false);
    };
    
    if (!notification || !isVisible || !user) {
        return null;
    }
    
    return (
        <Dialog open={isVisible} onOpenChange={(open) => !open && handleDismiss()}>
            <DialogContent className={cn(
                "sm:rounded-lg w-[calc(100%-2rem)] max-w-md",
                "sm:max-w-md"
            )}>
                <DialogHeader className="text-center space-y-4">
                     <div className="mx-auto flex flex-col items-center justify-center gap-4">
                        <Badge variant="secondary">New Notification</Badge>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Bell className="h-8 w-8" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <DialogTitle>{notification.title}</DialogTitle>
                        <DialogDescription>
                            {notification.message}
                        </DialogDescription>
                    </div>
                </DialogHeader>
                <DialogFooter className="flex-col-reverse sm:flex-col sm:space-x-0 gap-2 pt-4">
                    {notification.link && notification.link_text && (
                        <Button asChild size="lg" onClick={handleDismiss}>
                            <Link href={notification.link}>{notification.link_text}</Link>
                        </Button>
                    )}
                     <DialogClose asChild>
                        <Button type="button" variant="outline" size="lg">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
