
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from 'react';

function EmailVerifiedContent() {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.push('/login');
        }, 3000); // Redirect after 3 seconds

        return () => clearTimeout(timer);
    }, [router]);

    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
        </div>
        <Card className="w-full max-w-md animate-fade-in-up text-center bg-background/80 backdrop-blur-lg border-white/10 shadow-2xl rounded-2xl">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary rounded-full h-16 w-16 flex items-center justify-center mb-4">
                    <MailCheck className="h-8 w-8" />
                </div>
                <CardTitle className="text-3xl font-headline">
                    Email Verified!
                </CardTitle>
                <CardDescription>
                    Your email has been successfully verified. You will be redirected to the login page shortly.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                 <div className="flex items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                 </div>
                 <p className="text-sm text-muted-foreground mt-4">
                    Not redirected? <Link href="/login" className="font-medium text-primary hover:underline">Click here to log in</Link>.
                </p>
            </CardContent>
        </Card>
      </div>
    );
}

export default function EmailVerifiedPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
            <EmailVerifiedContent />
        </Suspense>
    )
}
