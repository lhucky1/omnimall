
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/Logo';
import Image from 'next/image';

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


const loginFormSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof loginFormSchema>) {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;
      
      if (!data.user) {
         throw new Error("Login failed. Please try again.");
      }

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push('/');
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred. Please try again.";
       if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Incorrect email or password. Please try again.";
      } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your inbox and verify your email address before logging in.";
      } else if (error.message) {
          errorMessage = error.message;
      }
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

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
                <CardTitle className="text-3xl font-headline tracking-tight">Welcome Back!</CardTitle>
                <CardDescription className="text-foreground/60">Login to continue your Omnimall journey.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
                 <Button variant="outline" className="w-full h-12 rounded-xl text-base" onClick={handleGoogleSignIn}>
                    <GoogleIcon className="mr-2"/>
                    Sign in with Google
                </Button>
                <div className="my-6 flex items-center">
                    <div className="flex-grow border-t border-muted"></div>
                    <span className="flex-shrink mx-4 text-xs uppercase text-muted-foreground">Or continue with</span>
                    <div className="flex-grow border-t border-muted"></div>
                </div>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input className="h-12 rounded-xl" placeholder="your.email@eg.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <div className="flex justify-between items-center">
                            <FormLabel>Password</FormLabel>
                            <Button type="button" variant="link" asChild className="p-0 h-auto text-xs">
                                <Link href="/reset-password">Forgot Password?</Link>
                            </Button>
                        </div>
                        <div className="relative">
                            <FormControl>
                            <Input 
                                className="h-12 rounded-xl"
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                {...field}
                            />
                            </FormControl>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                            </Button>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" className="w-full h-12 rounded-full text-base relative overflow-hidden" disabled={isLoading}>
                       <span className="relative z-10">{isLoading ? <Loader2 className="animate-spin" /> : "Login"}</span>
                    </Button>
                </form>
                </Form>
                <div className="mt-6 text-center text-sm">
                Don't have an account?{' '}
                <Link href="/signup" className="font-medium text-primary hover:underline">
                    Sign up
                </Link>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
