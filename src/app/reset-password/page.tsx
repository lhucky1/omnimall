
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, KeyRound, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { requestPasswordReset, resetPassword } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase';

const requestFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

const resetFormSchema = z.object({
  password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});


function ResetPasswordComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [view, setView] = useState<'request' | 'reset' | 'success'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const requestForm = useForm<z.infer<typeof requestFormSchema>>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm<z.infer<typeof resetFormSchema>>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const handleRequestSubmit = async (values: z.infer<typeof requestFormSchema>) => {
    setIsLoading(true);
    const result = await requestPasswordReset(values.email);
    if (result.success) {
      toast({
        title: "Reset Link Sent",
        description: "If an account exists for this email, a password reset link has been sent.",
      });
      setView('success');
    } else {
      toast({
        title: "Error",
        description: result.error || "Could not send password reset email.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleResetSubmit = async (values: z.infer<typeof resetFormSchema>) => {
    setIsLoading(true);
    const result = await resetPassword(values.password);
    if (result.success) {
       toast({
        title: "Password Updated",
        description: "Your password has been successfully changed. Please log in.",
      });
      router.push('/login');
    } else {
       toast({
        title: "Error updating password",
        description: result.error,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  if (view === 'success') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-headline">Check your inbox</CardTitle>
            <CardDescription>A password reset link has been sent to the email address you provided, if it exists in our system.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild className="w-full">
                <Link href="/login">Back to Login</Link>
            </Button>
        </CardContent>
      </Card>
    );
  }

  if (view === 'reset') {
    return (
        <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><KeyRound className="h-8 w-8" /></div>
            <CardTitle className="text-2xl font-headline">Set a New Password</CardTitle>
            <CardDescription>Enter your new password below. Make sure it's secure.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(handleResetSubmit)} className="space-y-6">
                <FormField control={resetForm.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <div className="relative">
                        <FormControl>
                            <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
                        </FormControl>
                        <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(p => !p)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                    <FormMessage />
                </FormItem>
                )}/>
                 <FormField control={resetForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <div className="relative">
                        <FormControl>
                            <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
                        </FormControl>
                         <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowConfirmPassword(p => !p)}>
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                    <FormMessage />
                </FormItem>
                )}/>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-headline">Forgot Password</CardTitle>
        <CardDescription>No worries, we'll send you reset instructions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...requestForm}>
          <form onSubmit={requestForm.handleSubmit(handleRequestSubmit)} className="space-y-6">
            <FormField control={requestForm.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input placeholder="your.email@eg.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
          </form>
        </Form>
        <div className="mt-6 text-center text-sm">
            Remembered your password?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Login
            </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
    return (
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
            <Suspense fallback={<Loader2 className="h-12 w-12 animate-spin" />}>
                <ResetPasswordComponent />
            </Suspense>
        </div>
    );
}
