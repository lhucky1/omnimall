
"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { deleteProduct } from '@/app/actions/product-admin';

const supabase = createClient();

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (loading) setShowSlowLoadMessage(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, profiles(display_name, avatar_url)')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProducts(data as Product[]);
      } catch (error: any) {
        toast({ title: "Error", description: "Could not fetch products.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (product: Product) => {
      setDeletingId(product.id);
      const result = await deleteProduct(product.id, product.image_urls || []);
      if (result.success) {
          toast({ title: 'Product Deleted', description: `${product.name} has been removed.` });
          fetchProducts();
      } else {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
      setDeletingId(null);
  }

  if (loading) {
    return (
        <div className="flex h-full flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
        </div>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>All Products</CardTitle>
            <CardDescription>Manage all product listings on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => (
                        <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                     <Avatar className="h-6 w-6">
                                        <AvatarImage src={product.profiles?.avatar_url || ''} />
                                        <AvatarFallback>{product.profiles?.display_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{product.profiles?.display_name || 'N/A'}</span>
                                </div>
                            </TableCell>
                            <TableCell>GHC {product.price.toFixed(2)}</TableCell>
                            <TableCell><Badge variant={product.status === 'approved' ? 'default' : 'secondary'}>{product.status}</Badge></TableCell>
                            <TableCell>{format(new Date(product.created_at), 'PPP')}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                                    <Link href={`/products/${product.id}`} target="_blank"><Eye className="h-4 w-4" /></Link>
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                                    <Link href={`/admin/products/${product.id}/edit`}><Edit className="h-4 w-4" /></Link>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon" className="h-8 w-8" disabled={deletingId === product.id}>
                                            {deletingId === product.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete the product "{product.name}" and all its data. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(product)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}

    