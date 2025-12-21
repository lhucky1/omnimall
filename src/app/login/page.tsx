
"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/Logo';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';


const supabase = createClient();

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="24px"
    height="24px"
    {...props}
  >
    <path
      fill="#FFC107"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <path
      fill="#FF3D00"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.28-7.962l-6.571,4.819C9.656,39.663,16.318,44,24,44z"
    />
    <path
      fill="#1976D2"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C44.591,34.923,48,29.82,48,24C48,22.659,47.862,21.35,47.611,20.083z"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);


  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  if (loading || user) {
      return (
          <div className="flex h-screen w-full flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      );
  }

  return (
     <div className="flex items-center justify-center min-h-screen p-4">
        <Image
            src="https://underground-peach-5pyqi8uvp3-a79eqti624.edgeone.dev/OM%20Logo.png"
            alt="Omnimall Background"
            fill
            className="object-cover -z-10 opacity-20 blur-sm"
        />

        <Card className="w-full max-w-md bg-background/80 backdrop-blur-lg border-white/10 shadow-2xl rounded-2xl animate-fade-in-up">
            <CardHeader className="text-center p-8">
                 <Logo className="text-4xl mx-auto"/>
                <CardTitle className="text-3xl font-headline tracking-tight">Welcome!</CardTitle>
                <CardDescription className="text-foreground/60">The one-stop shop for all student needs.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
                 <Button variant="outline" className="w-full h-12 rounded-xl text-base" onClick={handleGoogleSignIn}>
                    <GoogleIcon className="mr-2"/>
                    Sign in with Google
                </Button>
                <Alert className="mt-6">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Notice</AlertTitle>
                  <AlertDescription>
                    Due to technical issues with email services, sign-in is only available via Google at this time.
                  </AlertDescription>
                </Alert>
                 <div className="mt-6 text-center text-sm">
                    <Link href="/privacy" className="font-medium text-muted-foreground hover:underline">
                        Privacy Policy
                    </Link>
                    {' & '}
                     <Link href="/terms" className="font-medium text-muted-foreground hover:underline">
                        Terms
                    </Link>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
