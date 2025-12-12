
"use client";

import Link from 'next/link';
import { User, LogIn, LogOut, Package, Menu, Search, Home, Info, MessageCircleQuestion, Store, Heart, ShoppingCart, ShieldCheck, BookOpen, ShieldQuestion, FileText, Users, MessageSquare, Rss, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
  SheetHeader,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { usePathname, useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext';

const supabase = createClient();

const Header = () => {
  const { user, userProfile } = useAuth();
  const { itemCount, clearCart } = useCart();
  const { unreadCount } = useUnreadMessages();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearCart();
    router.push('/');
    router.refresh(); // Force a refresh to ensure state is cleared
  };
  
  const homePath = '/';

  const mainNavLinks = [
    { href: "/feed", label: "Feed", icon: Rss, auth: false },
    { href: "/sell", label: "Sell", icon: Package, auth: true },
  ];
  
  const secondaryNavLinks = [
      { href: "/about", label: "About", icon: Info, auth: false },
      { href: "/privacy", label: "Privacy Policy", icon: ShieldQuestion, auth: false },
      { href: "/terms", label: "Terms & Conditions", icon: BookOpen, auth: false },
      { href: "/team", label: "Team", icon: Users, auth: false },
  ]

  const MobileNav = () => (
     <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full max-w-xs p-4 bg-background flex flex-col">
            <SheetHeader className="text-left mb-6">
                 <SheetTitle className="sr-only">Menu</SheetTitle>
                 <Link href={homePath} className="flex items-center gap-2 text-xl font-bold text-primary font-headline" passHref>
                    <SheetClose>
                        <Store className="h-6 w-6" />
                        OMNIMALL
                    </SheetClose>
                </Link>
            </SheetHeader>
            <div className="flex flex-col gap-2 flex-grow">
                 {user && (
                    <>
                         <SheetClose asChild>
                            <Button variant={pathname === '/profile' ? 'secondary' : 'ghost'} className="justify-start text-base relative" asChild>
                                <Link href="/profile">
                                    <User className="mr-2"/>My Profile
                                </Link>
                            </Button>
                        </SheetClose>
                         <SheetClose asChild>
                            <Button variant={pathname.startsWith('/chat') ? 'secondary' : 'ghost'} className="justify-start text-base relative" asChild>
                                <Link href="/chat">
                                    <MessageSquare className="mr-2"/>My Chats
                                    {unreadCount > 0 && <Badge variant="destructive" className="absolute right-4">{unreadCount}</Badge>}
                                </Link>
                            </Button>
                        </SheetClose>
                        <SheetClose asChild>
                            <Button variant={pathname === '/wishlist' ? 'secondary' : 'ghost'} className="justify-start text-base" asChild>
                                <Link href="/wishlist"><Heart className="mr-2"/>My Wishlist</Link>
                            </Button>
                        </SheetClose>
                    </>
                 )}

                {mainNavLinks.filter(l => user || !l.auth).map(link => (
                  <SheetClose asChild key={link.href}>
                      <Button variant={pathname.startsWith(link.href) ? 'secondary' : 'ghost'} className="justify-start text-base" asChild><Link href={link.href}><link.icon className="mr-2"/>{link.label}</Link></Button>
                  </SheetClose>
                ))}

                 {user && (
                    <>
                        {userProfile?.is_verified_seller && (
                             <SheetClose asChild>
                                <Button variant={pathname === '/my-posts' ? 'secondary' : 'ghost'} className="justify-start text-base" asChild>
                                    <Link href="/my-posts"><PlusSquare className="mr-2"/>My Posts</Link>
                                </Button>
                            </SheetClose>
                        )}
                        {!userProfile?.is_verified_seller && (
                             <SheetClose asChild>
                                <Button variant={pathname === '/verify-seller' ? 'secondary' : 'ghost'} className="justify-start text-base" asChild>
                                    <Link href="/verify-seller"><ShieldCheck className="mr-2"/>Become a Seller</Link>
                                </Button>
                            </SheetClose>
                        )}
                    </>
                 )}
                 <Separator className="my-2"/>
                 {secondaryNavLinks.map(link => (
                      <SheetClose asChild key={link.href}>
                        <Button variant={pathname.startsWith(link.href) ? 'secondary' : 'ghost'} className="justify-start text-base" asChild><Link href={link.href}><link.icon className="mr-2"/>{link.label}</Link></Button>
                      </SheetClose>
                 ))}
            </div>

            <Separator className="my-4"/>

            {user ? (
                <SheetClose asChild>
                     <Button onClick={handleSignOut} variant="destructive" className="w-full justify-center text-base"><LogOut className="mr-2" />Log Out</Button>
                </SheetClose>
            ) : (
                <SheetClose asChild>
                    <Button asChild className="w-full"><Link href="/login"><LogIn className="mr-2 h-4 w-4" />Login</Link></Button>
                </SheetClose>
            )}
        </SheetContent>
      </Sheet>
  )

  return (
    <header className={cn(
        "sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b",
        pathname.startsWith('/admin') && "hidden"
    )}>
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 md:hidden">
            <MobileNav />
        </div>

        <Link href={homePath} className="hidden md:flex items-center gap-2 text-xl font-bold text-primary font-headline">
          <Store className="h-6 w-6"/>
          <span className="tracking-wider">OMNIMALL</span>
        </Link>
        
        <div className="md:hidden absolute left-1/2 -translate-x-1/2">
             <Link href={homePath} className="flex items-center gap-2 text-lg font-bold text-primary font-headline">
                <Store className="h-5 w-5"/>
                <span className="tracking-wider">OMNIMALL</span>
             </Link>
        </div>


        <nav className="hidden md:flex items-center gap-1">
          {mainNavLinks.filter(l => user || !l.auth).map(link => (
            <Button 
                variant={pathname.startsWith(link.href) ? 'secondary' : 'ghost'} 
                asChild 
                key={link.href}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost">
                        More
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {secondaryNavLinks.map(link => (
                         <DropdownMenuItem asChild key={link.href}>
                          <Link href={link.href} className="flex items-center">
                            <link.icon className="mr-2 h-4 w-4" />
                            <span>{link.label}</span>
                          </Link>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </nav>
        
        <div className="flex items-center gap-2 sm:gap-4">
             {user ? (
                <>
                <ThemeToggle />
                 <Button asChild variant="ghost" size="icon" className="relative">
                    <Link href="/chat">
                        <MessageSquare className="h-6 w-6" />
                        {unreadCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0 text-xs">{unreadCount}</Badge>}
                        <span className="sr-only">My Chats</span>
                    </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" className="relative">
                    <Link href="/cart">
                        <ShoppingCart className="h-6 w-6" />
                        {itemCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0 text-xs">{itemCount}</Badge>}
                        <span className="sr-only">Shopping Cart</span>
                    </Link>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9 hidden md:inline-flex">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={userProfile?.avatar_url || ''} alt={userProfile?.display_name || ''} />
                                <AvatarFallback>
                                    {userProfile?.display_name ? userProfile.display_name.charAt(0).toUpperCase() : <User className="h-4 w-4"/>}
                                </AvatarFallback>
                            </Avatar>
                            <span className="sr-only">User Profile</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile & Dashboard</span>
                        </Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem asChild>
                          <Link href="/chat" className="flex items-center relative">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span>My Chats</span>
                            {unreadCount > 0 && <Badge variant="destructive" className="absolute right-2">{unreadCount}</Badge>}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/wishlist" className="flex items-center">
                            <Heart className="mr-2 h-4 w-4" />
                            <span>My Wishlist</span>
                          </Link>
                        </DropdownMenuItem>
                         {userProfile?.is_verified_seller && (
                             <DropdownMenuItem asChild>
                                <Link href="/my-posts" className="flex items-center">
                                    <PlusSquare className="mr-2 h-4 w-4" />
                                    <span>My Posts</span>
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {!userProfile?.is_verified_seller && (
                             <DropdownMenuItem asChild>
                                <Link href="/verify-seller" className="flex items-center">
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    <span>Become a Seller</span>
                                </Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </>
             ) : (
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button asChild>
                        <Link href="/login">Login</Link>
                    </Button>
                </div>
             )}
        </div>
      </div>
    </header>
  );
};

export default Header;
