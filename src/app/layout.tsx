
"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Header from './header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import MobileBottomNav from '@/components/MobileBottomNav';
import { WishlistProvider } from '@/contexts/WishlistContext';
import LiveNotification from '@/components/LiveNotification';
import { ThemeProvider } from "next-themes";
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UnreadMessagesProvider } from '@/contexts/UnreadMessagesContext';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  const isChatPage = pathname.startsWith('/chat/');
  const isSignupSuccessPage = pathname === '/signup-success';
  const isEmailVerifiedPage = pathname === '/email-verified';
  const isLoginPage = pathname === '/login';
  const isSignupPage = pathname === '/signup';

  const showHeaderAndFooter = !isChatPage && !isSignupSuccessPage && !isLoginPage && !isSignupPage && !isEmailVerifiedPage;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Bebas+Neue&display=swap" rel="stylesheet" />
        <title>OMNIMALL</title>
        <meta name="description" content="Your one-stop shop for all student needs." />
      </head>
      <body 
        className={cn(
          "font-body antialiased",
          "flex flex-col min-h-screen bg-background sm:bg-secondary/20 h-dvh"
        )} 
        suppressHydrationWarning={true}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <UnreadMessagesProvider>
                  <div className={cn("flex flex-col flex-1", isChatPage && "h-full")}>
                    {showHeaderAndFooter && <Header />}
                    <LiveNotification />
                    <main className={cn(
                      "flex-1 flex flex-col",
                      !isChatPage && !isSignupSuccessPage && !isLoginPage && !isSignupPage && !isEmailVerifiedPage && "container mx-auto sm:py-6 pb-20 sm:pb-6",
                      isAdminPage && "p-0 sm:py-0 container-none max-w-full"
                    )}>
                      {children}
                    </main>
                    {showHeaderAndFooter && !pathname.startsWith('/chat') && <Footer />}
                    {showHeaderAndFooter && !pathname.startsWith('/chat') && <MobileBottomNav />}
                  </div>
                  <Toaster />
                </UnreadMessagesProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
