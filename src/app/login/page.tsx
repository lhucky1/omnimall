
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

  return (
     <div className="flex items-center justify-center min-h-screen p-4">
        <Image
            src="https://underground-peach-5pyqi8uvp3-a79eqti624.edgeone.dev/OM%20Logo.png"
            alt="Omnimall Background"
            fill
            className="object-cover -z-10"
        />

        <Card className="w-full max-w-md bg-background/80 backdrop-blur-lg border-white/10 shadow-2xl rounded-2xl animate-fade-in-up">
            <CardHeader className="text-center p-8">
                 <Logo className="text-4xl mx-auto"/>
                <CardTitle className="text-3xl font-headline tracking-tight">Welcome Back!</CardTitle>
                <CardDescription className="text-foreground/60">Login to continue your Omnimall journey.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
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
