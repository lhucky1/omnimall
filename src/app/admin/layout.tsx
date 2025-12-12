
"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminHeader from './header';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';


export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isAuthenticated === null) {
                setShowSlowLoadMessage(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [isAuthenticated]);
    
    useEffect(() => {
        if (authLoading) {
            return;
        }

        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'ericboatenglucky@gmail.com';

        if (user && user.email === adminEmail) {
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
    }, [user, authLoading, router]);

    if (authLoading || isAuthenticated === null) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                            <ShieldAlert className="h-8 w-8" />
                        </div>
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>
                            You are not authorized to view this page. Please log in with an admin account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                         <Button asChild size="lg">
                            <Link href="/login">Go to Login</Link>
                        </Button>
                         <Button variant="outline" asChild>
                            <Link href="/">Back to Homepage</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col">
            <AdminHeader />
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-muted/40">
                {children}
            </main>
        </div>
    );
}

    