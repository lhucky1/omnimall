
"use client";

import { Home, Heart, PackagePlus, User, MessageSquare, Rss } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext';
import { Badge } from './ui/badge';

export default function MobileBottomNav() {
    const pathname = usePathname();
    const { user, userProfile } = useAuth();
    const { unreadCount } = useUnreadMessages();

    if (pathname.startsWith('/admin') || pathname.startsWith('/chat/')) {
        return null;
    }

    const homePath = '/';

    const navItems = [
        { href: homePath, icon: Home, label: 'Home' },
        { href: '/feed', icon: Rss, label: 'Feed' },
        { href: userProfile?.is_verified_seller ? '/my-posts' : '/sell', icon: PackagePlus, label: 'Sell' },
        { href: '/chat', icon: MessageSquare, label: 'Chats', badge: unreadCount },
        { href: '/profile', icon: User, label: 'Account' },
    ];

    return (
        <div className="btm-nav md:hidden">
            {navItems.map((item) => {
                const isActive = item.href === '/' ? pathname === item.href : pathname.startsWith(item.href);
                const isFeedActive = item.href === '/feed' && pathname === '/feed';

                return (
                    <Link key={item.label} href={item.href} className={cn(
                        "text-muted-foreground relative flex-1",
                        (isActive && item.href !== '/feed') && "active text-primary",
                        isFeedActive && "active text-primary"
                    )}>
                        <item.icon className="h-5 w-5" />
                        <span className="text-xs">{item.label}</span>
                         {item.badge !== undefined && item.badge > 0 && (
                            <Badge variant="destructive" className="absolute top-1 right-1/2 translate-x-[120%] h-4 w-4 justify-center rounded-full p-0 text-[10px]">{item.badge}</Badge>
                        )}
                    </Link>
                );
            })}
        </div>
    );
}
