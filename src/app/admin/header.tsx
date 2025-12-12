
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, LayoutDashboard, Users, Package, LogOut, ShoppingBag, Bell, UserCog, Truck, Rss } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/sellers", label: "Sellers", icon: Users },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/feed", label: "Feed", icon: Rss },
    { href: "/admin/staff", label: "Staff", icon: UserCog },
    { href: "/admin/merchandising", label: "Merchandising", icon: ShoppingBag },
    { href: "/admin/dropshipping", label: "Dropshipping", icon: Truck },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
];

export default function AdminHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();

    const handleSignOut = async () => {
        // Since we are using the main auth, we sign out from there
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
    };

    const NavContent = () => (
        <nav className="flex flex-col gap-2">
            {navLinks.map(link => (
                <SheetClose asChild key={link.href}>
                    <Link href={link.href}>
                        <Button
                            variant={pathname.startsWith(link.href) ? 'secondary' : 'ghost'}
                            className="w-full justify-start"
                        >
                            <link.icon className="mr-2 h-4 w-4" />
                            {link.label}
                        </Button>
                    </Link>
                </SheetClose>
            ))}
        </nav>
    );

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle Menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col">
                        <h2 className="text-lg font-semibold mb-4">OMNIMALL Admin</h2>
                        <NavContent />
                         <div className="mt-auto">
                            <Button variant="destructive" className="w-full" onClick={handleSignOut}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
                <h1 className="text-xl font-semibold">OMNIMALL Admin</h1>
                 {navLinks.map(link => (
                    <Link href={link.href} key={link.href}>
                        <Button variant={pathname.startsWith(link.href) ? 'secondary' : 'ghost'}>
                            {link.label}
                        </Button>
                    </Link>
                ))}
            </div>

            <div className="flex-1" />

            <Button variant="destructive" size="sm" onClick={handleSignOut} className="hidden md:flex">
                Sign Out
            </Button>
        </header>
    );
}
