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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, UserCheck, PackagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { createProduct } from '@/app/actions/products';

const supabase = createClient();

const MAX_IMAGES = 5;
const MIN_IMAGES = 1;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const formSchema = z.object({
  name: z.string().min(5, { message: 'Product/Service name must be at least 5 characters.' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters.' }),
  price: z.coerce.number().min(1, { message: 'Price must be at least 1 GHC.' }),
  category: z.string().min(1, { message: 'Category is required.' }),
  type: z.enum(['product', 'service']),
  condition: z.enum(['new', 'used', 'na']),
  images: z.any(),
  location: z.string().min(3, { message: "Please specify your business or pickup location."}),
  delivery_option: z.enum(['none', 'paid', 'free', 'based_on_location']),
  delivery_price: z.coerce.number().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1.").optional(),
  is_unlimited: z.boolean().default(false),
}).superRefine((data, ctx) => {
    if (data.type === 'product') {
        const files = data.images ? Array.from(data.images as FileList) : [];
        if (files.length < MIN_IMAGES) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['images'], message: `At least ${MIN_IMAGES} image is required for products.` });
        } else {
            if (files.length > MAX_IMAGES) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['images'], message: `You can upload a maximum of ${MAX_IMAGES} images.` });
            }
            for (const file of files) {
                if (file.size > MAX_FILE_SIZE) {
                    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['images'], message: `Each file size must be less than 5MB.`});
                    break;
                }
                if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['images'], message: "Only .jpg, .png, and .webp formats are supported." });
                    break;
                }
            }
        }
    }
    if (data.delivery_option === 'paid') {
        if (!data.delivery_price || data.delivery_price <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['delivery_price'],
                message: 'A delivery price greater than 0 is required.',
            });
        }
    }
    if (data.type === 'product' && !data.is_unlimited) {
        if (!data.quantity || data.quantity < 1) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['quantity'],
                message: 'Quantity must be at least 1 unless stock is unlimited.',
            });
        }
    }
});


export default function SellPage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      category: '',
      type: 'product',
      condition: 'new',
      images: undefined,
      location: '',
      delivery_option: 'none',
      delivery_price: 0,
      quantity: 1,
      is_unlimited: false,
    },
     mode: "onChange",
  });

  const productType = form.watch('type');
  const deliveryOption = form.watch('delivery_option');
  const imageFiles = form.watch('images');
  const isUnlimited = form.watch('is_unlimited');

  useEffect(() => {
    if (imageFiles && imageFiles.length > 0) {
        const urls = Array.from(imageFiles as FileList).map(file => URL.createObjectURL(file));
        setImagePreviews(urls);

        return () => {
            urls.forEach(url => URL.revokeObjectURL(url));
        }
    } else {
        setImagePreviews([]);
    }
  }, [imageFiles]);
  
  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/login');
    }
  }, [user, authLoading, router]);
  

  useEffect(() => {
    if (userProfile) {
        if (userProfile.location) {
            form.setValue('location', userProfile.location);
        }
    }
  }, [userProfile, form]);

  useEffect(() => {
    if (deliveryOption !== 'paid') {
      form.setValue('delivery_price', 0);
    }
  }, [deliveryOption, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ title: 'Please login to sell an item.', variant: 'destructive' });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('name', values.name);
    formData.append('description', values.description);
    formData.append('price', String(values.price));
    formData.append('category', values.category);
    formData.append('type', values.type);
    formData.append('condition', values.type === 'product' ? values.condition : 'na');
    formData.append('location', values.location);
    formData.append('delivery_option', values.delivery_option);
    if(values.delivery_option === 'paid' && values.delivery_price) {
        formData.append('delivery_price', String(values.delivery_price));
    }
    if(values.is_unlimited) {
        formData.append('is_unlimited', 'on');
    } else if (values.quantity) {
        formData.append('quantity', String(values.quantity));
    }
    
    if (values.type === 'product' && values.images) {
        for (const file of Array.from(values.images as FileList)) {
            formData.append('images', file);
        }
    }

    try {
      const result = await createProduct(formData);
      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: 'Your Item is Live!',
        description: 'Your item has been successfully listed on the marketplace.',
      });
      router.push('/products');
    } catch (error: any) {
      console.error('Listing Failed Error: ', error);
      toast({
        title: 'Listing Failed',
        description:
          error.message || 'Could not process your item listing.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }


  if (authLoading || !user) {
    return (
        <div className="flex justify-center items-center h-screen -mt-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

    if (!userProfile?.is_verified_seller) {
      return (
           <div className="container mx-auto px-4 py-20 flex justify-center items-center">
                <Card className="max-w-lg w-full text-center">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 text-primary rounded-full h-16 w-16 flex items-center justify-center mb-4">
                            <UserCheck className="h-8 w-8" />
                        </div>
                        <CardTitle>Become a Seller to Continue</CardTitle>
                        <CardDescription>
                            To list items on OMNIMALL, you need to complete your seller profile first. It's a quick, one-time setup.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild size="lg">
                            <Link href="/verify-seller">Complete Your Seller Profile</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
      )
  }


  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-10">
            <h1 className="text-4xl font-bold font-headline text-primary">Sell Something Great</h1>
            <p className="mt-2 text-lg text-muted-foreground">Fill out the form below to list your product or service on the marketplace.</p>
        </div>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>1. Item Details</CardTitle>
                        <CardDescription>Start with the basics. What are you selling?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{productType === 'product' ? 'Product Name' : 'Service Title'}</FormLabel>
                                <FormControl><Input placeholder={productType === 'product' ? "e.g., Used iPhone 12 Pro" : "e.g., Graphic Design Services"} {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl><Textarea placeholder={productType === 'product' ? "Describe your product in detail..." : "Describe the service you offer, what's included, and your experience..."} {...field} rows={5} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Type</FormLabel>
                                    <Select onValueChange={(value) => {
                                        field.onChange(value);
                                        form.setValue('condition', value === 'service' ? 'na' : 'new');
                                        form.trigger('images');
                                    }} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="product">Product</SelectItem>
                                        <SelectItem value="service">Service</SelectItem>
                                    </SelectContent>
                                    </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            {productType === 'product' && (
                                <FormField control={form.control} name="condition" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Condition</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a condition" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="new">New</SelectItem>
                                            <SelectItem value="used">Used</SelectItem>
                                        </SelectContent>
                                        </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>2. Pricing &amp; Inventory</CardTitle>
                        <CardDescription>Set your price and stock levels.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="price" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{productType === 'product' ? 'Item Price (GHC)' : 'Starting Price (GHC)'}</FormLabel>
                                    <FormControl><Input type="number" placeholder="50.00" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="electronics">Electronics</SelectItem>
                                            <SelectItem value="textbooks">Textbooks & Notes</SelectItem>
                                            <SelectItem value="fashion">Fashion & Apparel</SelectItem>
                                            <SelectItem value="services">Services & Tutoring</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        {productType === 'product' && (
                             <div className="grid md:grid-cols-2 gap-6 items-end">
                                 <FormField
                                    control={form.control}
                                    name="quantity"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Quantity Available</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="10" {...field} disabled={isUnlimited} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="is_unlimited"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-10">
                                            <FormControl>
                                                <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Unlimited stock</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {productType === 'product' && (
                     <Card>
                        <CardHeader>
                            <CardTitle>3. Product Images</CardTitle>
                            <CardDescription>Upload between ${MIN_IMAGES} and ${MAX_IMAGES} images of your product. The first image will be the main one.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="images"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormControl>
                                        <Input type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={(e) => field.onChange(e.target.files)} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {imagePreviews.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {imagePreviews.map((src, index) => (
                                    <div key={index} className="relative aspect-square">
                                        <Image src={src} alt={`Preview ${index}`} fill className="object-cover rounded-md" />
                                    </div>
                                ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
               
                <Card>
                    <CardHeader>
                        <CardTitle>4. Fulfillment</CardTitle>
                        <CardDescription>How will buyers get their item?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="location" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Pickup Location</FormLabel>
                                <FormControl><Input placeholder="e.g., UPSA Campus, Front Gate" {...field} /></FormControl>
                                <FormDescription>Where should buyers meet you?</FormDescription>
                                <FormMessage />
                            </FormItem>
                         )}/>
                          <FormField control={form.control} name="delivery_option" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Delivery</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select a delivery option" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">No delivery (Pickup only)</SelectItem>
                                    <SelectItem value="free">Free Delivery</SelectItem>
                                    <SelectItem value="paid">Paid Delivery</SelectItem>
                                    <SelectItem value="based_on_location">Based on Location</SelectItem>
                                </SelectContent>
                                </Select>
                            <FormMessage />
                            </FormItem>
                        )}/>
                        {deliveryOption === 'paid' && (
                             <FormField control={form.control} name="delivery_price" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Delivery Price (GHC)</FormLabel>
                                    <FormControl><Input type="number" placeholder="10.00" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        )}
                    </CardContent>
                </Card>
                 
                <div className="flex justify-end">
                    <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <PackagePlus className="mr-2 h-4 w-4"/>
                                <span>List Item Now</span>
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    </div>
  );
}