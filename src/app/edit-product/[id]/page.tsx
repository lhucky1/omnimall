
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product } from '@/types';
import Link from 'next/link';

const supabase = createClient();

const formSchema = z.object({
  name: z.string().min(5, { message: 'Product name must be at least 5 characters.' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters.' }),
  price: z.coerce.number().min(1, { message: 'Price must be at least 1 GHC.' }),
  category: z.string().min(3, { message: 'Category is required.' }),
  type: z.enum(['product', 'service']),
  condition: z.enum(['new', 'used', 'na']),
});

const MAX_EDITS = 2;

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      category: '',
      type: 'product',
      condition: 'new',
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
        if (authLoading || isLoadingProduct || !user) {
            setShowSlowLoadMessage(true);
        }
    }, 5000);
    return () => clearTimeout(timer);
  }, [authLoading, isLoadingProduct, user]);

  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (id && user) {
        const fetchProduct = async () => {
            setIsLoadingProduct(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .eq('seller_uid', user.id)
                .single();
            
            if (error || !data) {
                toast({ title: "Error", description: "Could not fetch product or you do not have permission to edit it.", variant: "destructive"});
                router.push('/profile');
            } else {
                setProduct(data as Product);
                form.reset({
                    name: data.name,
                    description: data.description,
                    price: data.price,
                    category: data.category,
                    type: data.type,
                    condition: data.condition,
                });
            }
            setIsLoadingProduct(false);
        };
        fetchProduct();
    }
  }, [id, user, router, toast, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !product) return;

    if (product.edit_count && product.edit_count >= MAX_EDITS) {
        toast({
            title: "Edit Limit Reached",
            description: `You can only edit a product ${MAX_EDITS} times.`,
            variant: "destructive"
        });
        return;
    }

    setIsSubmitting(true);
    
    try {
        const { error } = await supabase
            .from('products')
            .update({
                name: values.name,
                description: values.description,
                price: values.price,
                category: values.category,
                type: values.type,
                condition: values.type === 'product' ? values.condition : 'na',
                edit_count: (product.edit_count || 0) + 1,
            })
            .eq('id', product.id);

        if (error) throw error;
        
        toast({
            title: "Product Updated!",
            description: `${values.name} has been successfully updated.`,
        });
        router.push('/profile');
    } catch (error: any) {
        console.error("Update Failed Error: ", error)
        toast({
            title: "Update Failed",
            description: error.message || "Could not update your product.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const productType = form.watch('type');

  if (authLoading || isLoadingProduct || !user) {
    return (
        <div className="flex flex-col justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
        </div>
    );
  }

  const editsLeft = product ? MAX_EDITS - (product.edit_count || 0) : 0;

  return (
    <div className="flex justify-center items-center py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Product or Service</CardTitle>
          <CardDescription>
            Update the details for your item. You have <span className="font-bold text-primary">{editsLeft}</span> {editsLeft === 1 ? 'edit' : 'edits'} remaining.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Used iPhone 12 Pro or Graphic Design Services" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Describe your product or service in detail..." {...field} rows={5} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                 <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  )}
                />
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
                    )}
                    />
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Price (GHC)</FormLabel>
                        <FormControl><Input type="number" placeholder="50.00" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />
                <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl><Input placeholder="e.g., Electronics, Tutoring" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />
              </div>

                <div className="text-sm text-muted-foreground">
                    Note: Image uploads cannot be changed after the initial listing.
                </div>


              <div className="flex gap-4">
                <Button type="button" variant="outline" asChild className="w-full">
                   <Link href="/profile">Cancel</Link>
                </Button>
                <Button type="submit" className="w-full" disabled={isSubmitting || (product?.edit_count || 0) >= MAX_EDITS}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    