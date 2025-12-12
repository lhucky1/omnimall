
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product } from '@/types';
import Link from 'next/link';
import { updateProductAsAdmin } from '@/app/actions/product-admin';

const supabase = createClient();

const formSchema = z.object({
  name: z.string().min(5, { message: 'Product name must be at least 5 characters.' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters.' }),
  price: z.coerce.number().min(0, { message: 'Price cannot be negative.' }),
  category: z.string().min(1, { message: 'Category is required.' }),
  type: z.enum(['product', 'service']),
  condition: z.enum(['new', 'used', 'na']),
  status: z.enum(['pending', 'approved', 'rejected']),
});

export default function AdminEditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (id) {
        const fetchProduct = async () => {
            setIsLoadingProduct(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error || !data) {
                toast({ title: "Error", description: "Could not fetch product details.", variant: "destructive"});
                router.push('/admin/products');
            } else {
                setProduct(data as Product);
                form.reset({
                    name: data.name,
                    description: data.description,
                    price: data.price,
                    category: data.category,
                    type: data.type,
                    condition: data.condition,
                    status: data.status,
                });
            }
            setIsLoadingProduct(false);
        };
        fetchProduct();
    }
  }, [id, router, toast, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!product) return;
    setIsSubmitting(true);
    
    const result = await updateProductAsAdmin(product.id, values);

    if (result.success) {
        toast({
            title: "Product Updated!",
            description: `${values.name} has been successfully updated.`,
        });
        router.push('/admin/products');
    } else {
        toast({
            title: "Update Failed",
            description: result.error || "Could not update the product.",
            variant: "destructive",
        });
    }
    setIsSubmitting(false);
  }

  const productType = form.watch('type');

  if (isLoadingProduct) {
    return (
        <div className="flex flex-col justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div>
        <Button variant="outline" asChild className="mb-4">
            <Link href="/admin/products"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Products</Link>
        </Button>
        <Card className="w-full max-w-3xl mx-auto">
            <CardHeader>
            <CardTitle>Edit Product (Admin)</CardTitle>
            <CardDescription>
                You are editing as an administrator. Changes are saved directly.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea {...field} rows={5} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price (GHC)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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

                    <div className="grid md:grid-cols-3 gap-6">
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="new">New</SelectItem>
                                        <SelectItem value="used">Used</SelectItem>
                                    </SelectContent>
                                    </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>
                        )}
                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                                </Select>
                            <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        Note: Image uploads cannot be changed from this interface.
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Form>
            </CardContent>
        </Card>
    </div>
  );
}
