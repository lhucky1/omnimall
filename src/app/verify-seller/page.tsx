
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, Camera, Upload, Trash2 } from 'lucide-react';
import { submitVerification } from '@/app/actions/verification';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import CameraCapture from '@/components/CameraCapture';
import Image from 'next/image';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Your full name is required.' }),
  businessName: z.string().min(2, { message: 'A business or seller name is required.' }),
  location: z.string().min(3, { message: 'Please specify your location.' }),
  businessEmail: z.string().email({ message: 'A valid business email is required.' }),
  businessPhone: z.string().min(10, { message: 'A valid business phone number is required.' }),
  selfie: z.instanceof(File, { message: 'A display photo is required.' })
    .refine((file) => file.size <= MAX_FILE_SIZE, 'Photo must be less than 5MB.')
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "Only .jpg, .png, and .webp formats are supported."
    ),
});

export default function VerifySellerPage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading, fetchUserProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        fullName: '',
        businessName: '',
        businessEmail: '',
        businessPhone: '',
        location: '',
    },
    mode: "onChange"
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSubmitting) {
        timer = setTimeout(() => {
            setShowSlowLoadMessage(true);
        }, 5000); // Show message after 5 seconds
    } else {
        setShowSlowLoadMessage(false);
    }
    return () => clearTimeout(timer);
  }, [isSubmitting]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
     if (!authLoading && userProfile?.is_verified_seller) {
      router.push('/sell');
    }
  }, [user, userProfile, authLoading, router]);
  
  useEffect(() => {
      // Prefill form with profile data if available
      if (userProfile) {
          form.setValue('fullName', userProfile.display_name || '');
          form.setValue('businessEmail', userProfile.email || '');
          form.setValue('businessPhone', userProfile.phone_number || '');
          form.setValue('location', userProfile.location || '');
      }
  }, [userProfile, form]);

  const handleCapture = (file: File) => {
    form.setValue('selfie', file, { shouldValidate: true });
    setSelfiePreview(URL.createObjectURL(file));
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('selfie', file, { shouldValidate: true });
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  const removeSelfie = () => {
    form.setValue('selfie', undefined as any, { shouldValidate: true });
    if(selfiePreview) URL.revokeObjectURL(selfiePreview);
    setSelfiePreview(null);
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!user) throw new Error("Authentication failed. Please log in and try again.");

      const formData = new FormData();
      formData.append('fullName', values.fullName);
      formData.append('businessName', values.businessName);
      formData.append('location', values.location);
      formData.append('businessEmail', values.businessEmail);
      formData.append('businessPhone', values.businessPhone);
      formData.append('selfie', values.selfie);

      const result = await submitVerification(formData);

      if (!result.success) {
        throw new Error(result.error || 'An unknown error occurred.');
      }
      
      await fetchUserProfile(user!); // Refresh user profile to get new status
      setIsSubmitted(true);

    } catch (error: any) {
        console.error("Submission Failed Error: ", error)
        toast({
            title: "Submission Failed",
            description: error.message || "An unexpected server error occurred. Please try again later.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (authLoading || !user) {
    return (
        <div className="flex flex-col justify-center items-center h-screen -mt-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
        </div>
    );
  }
  
  if (userProfile?.is_verified_seller) {
     return (
        <div className="flex flex-col justify-center items-center h-screen -mt-20">
            <p>You are already a verified seller. Redirecting...</p>
            <Loader2 className="mt-4 h-8 w-8 animate-spin" />
        </div>
     );
  }

  if (isSubmitted) {
    return (
        <div className="container mx-auto px-4 py-12 text-center">
            <Alert className="max-w-lg mx-auto">
                <UserCheck className="h-4 w-4" />
                <AlertTitle>You're Now a Seller!</AlertTitle>
                <AlertDescription>
                    Your seller profile is complete. You can now start listing items on the marketplace.
                </AlertDescription>
            </Alert>
            <div className="mt-6">
                 <Button onClick={() => router.push('/sell')}>Start Selling</Button>
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="text-center mb-10">
            <h1 className="text-4xl font-bold font-headline text-primary">Become a Seller</h1>
            <p className="mt-2 text-lg text-muted-foreground">Complete your seller profile to start listing items. This is a one-time setup.</p>
        </div>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>1. Your Details</CardTitle>
                        <CardDescription>Provide some basic information about yourself and your business.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="fullName" render={({ field }) => (
                                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="businessName" render={({ field }) => (
                                <FormItem><FormLabel>Business/Seller Name</FormLabel><FormControl><Input placeholder="John's Deals" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                         </div>
                         <FormField control={form.control} name="location" render={({ field }) => (
                             <FormItem><FormLabel>Your Location</FormLabel><FormControl><Input placeholder="e.g., UPSA Campus, Madina" {...field} /></FormControl><FormDescription>This will be shown as your pickup location.</FormDescription><FormMessage /></FormItem>
                         )}/>
                         <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="businessEmail" render={({ field }) => (
                                <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input type="email" placeholder="contact@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="businessPhone" render={({ field }) => (
                                <FormItem><FormLabel>Contact Phone</FormLabel><FormControl><Input type="tel" placeholder="0241234567" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                         </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>2. Display Photo</CardTitle>
                        <CardDescription>Upload a photo that will be used as your profile picture.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="selfie" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="sr-only">Display Photo</FormLabel>
                                {selfiePreview ? (
                                    <div className="w-full flex flex-col items-center gap-4">
                                        <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-primary/50">
                                            <Image src={selfiePreview} alt="Selfie Preview" fill className="object-cover"/>
                                        </div>
                                        <Button type="button" variant="destructive" size="sm" onClick={removeSelfie}><Trash2 className="mr-2"/>Remove Photo</Button>
                                    </div>
                                ) : (
                                     <div className="flex items-center justify-center w-full">
                                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                                            <label htmlFor="selfie-upload" className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <Upload className="w-8 h-8 mb-3 text-muted-foreground"/>
                                                    <p className="mb-2 text-sm text-center text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span><br/>or drag and drop</p>
                                                </div>
                                                <Input id="selfie-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                                            </label>
                                            <Button type="button" onClick={() => setIsCameraOpen(true)} className="w-full h-40">
                                                <Camera className="w-8 h-8 mr-2"/> Use Camera
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                <FormMessage className="text-center pt-2" />
                            </FormItem>
                        )}/>
                        <CameraCapture onCapture={handleCapture} open={isCameraOpen} onOpenChange={setIsCameraOpen} aspectRatio={1} />
                    </CardContent>
                </Card>

                <div className="flex flex-col items-end">
                    <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4"/>}
                        {isSubmitting ? 'Submitting...' : 'Complete Seller Profile'}
                    </Button>
                    {isSubmitting && showSlowLoadMessage && (
                        <p className="mt-2 text-sm text-muted-foreground">Taking too long? Please refresh and try again.</p>
                    )}
                </div>
            </form>
        </Form>
    </div>
  );
}

    

    