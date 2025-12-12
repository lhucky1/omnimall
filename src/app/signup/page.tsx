
"use client";

import { useState, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';

const supabase = createClient();

const passwordStrength = (password: string) => {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
};


const formSchema = z.object({
  displayName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' })
    .refine((value) => passwordStrength(value) >= 4, {
        message: "Password is too weak. Include uppercase, lowercase, numbers, and symbols.",
    }),
  phoneNumber: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  location: z.string().min(3, { message: 'Please enter your location (e.g., hostel name or area).' }),
  terms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions.",
  }),
});


export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState({ score: 0, label: '', color: '' });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      phoneNumber: '',
      location: '',
      terms: false,
    },
     mode: "onChange"
  });

  const passwordValue = form.watch('password');

  const updatePasswordStrength = (password: string) => {
      const score = passwordStrength(password);
      let label = 'Weak';
      let color = 'bg-red-500';

      if (score >= 5) {
          label = 'Very Strong';
          color = 'bg-green-600';
      } else if (score >= 4) {
          label = 'Strong';
          color = 'bg-green-500';
      } else if (score >= 3) {
          label = 'Medium';
          color = 'bg-yellow-500';
      }
      setStrength({ score, label, color });
  };
  
  useEffect(() => {
    updatePasswordStrength(passwordValue);
  }, [passwordValue]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            display_name: values.displayName,
            phone_number: values.phoneNumber,
            location: values.location,
          },
          emailRedirectTo: `${window.location.origin}/email-verified`,
        },
      });

      if (error) throw error;
      
      router.push('/signup-success');
      
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.message.includes('Email rate limit exceeded')) {
          errorMessage = "Too many attempts. Please wait a moment and try again.";
      } else if (error.message.includes('already registered')) {
          errorMessage = "This email address is already in use. Please use a different email or log in.";
      } else if (error.message) {
          errorMessage = error.message;
      }
      toast({
        title: "Sign-up Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
    }
  }


  return (
    <div className="relative flex-grow flex justify-center items-center p-4 overflow-hidden">
        <Image
            src="https://underground-peach-5pyqi8uvp3-a79eqti624.edgeone.dev/OM%20Logo.png"
            alt="Omnimall Background"
            fill
            className="object-cover -z-10"
        />
      <Card className="w-full max-w-md z-10 shadow-xl bg-background/80 backdrop-blur-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
          <CardDescription>Join OMNIMALL today!</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your.email@eg.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="0241234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Block A, Room 101" {...field} />
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
                        <FormLabel>Password</FormLabel>
                        <div className="relative">
                            <FormControl>
                                <Input 
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
                        {field.value && (
                            <div className="space-y-2 pt-1">
                                <Progress value={strength.score * 20} className="h-2" indicatorClassName={strength.color} />
                                <p className="text-sm font-medium" style={{ color: strength.color.startsWith('bg-') ? strength.color.slice(3, -4) : strength.color }}>
                                    {strength.label}
                                </p>
                            </div>
                        )}
                    </FormItem>
                )}
              />

               <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        By signing up, you agree to our{' '}
                        <Link href="/terms" className="font-medium text-primary hover:underline" target="_blank">
                          Terms & Conditions
                        </Link>
                        .
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading || strength.score < 4 || !form.getValues('terms')}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
