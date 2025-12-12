

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import type { Product, UserProfile } from "@/types";
import { createClient } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2, Frown, User, Phone, ChevronLeft } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const supabase = createClient();

export default function SellerProfilePage() {
    const params = useParams();
    const sellerId = params.id as string;
    const searchParams = useSearchParams();
    
    const [seller, setSeller] = useState<UserProfile | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const from = searchParams.get('from');
    const backLink = '/?view=all';
    const backText = 'Back to All Products';

    useEffect(() => {
        if (sellerId) {
            const fetchSellerData = async () => {
                setLoading(true);
                
                // Fetch seller profile
                const { data: sellerData, error: sellerError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('uid', sellerId)
                    .single();

                if (sellerError || !sellerData) {
                    console.error('Error fetching seller:', sellerError);
                    setError('Seller not found.');
                    setLoading(false);
                    return;
                }
                setSeller(sellerData as UserProfile);

                // Fetch seller products
                const { data: productData, error: productError } = await supabase
                    .from('products')
                    .select(`
                        *,
                        profiles (
                            phone_number,
                            display_name,
                            avatar_url
                        )
                    `)
                    .eq('seller_uid', sellerId)
                    .eq('status', 'approved'); // Only show approved products

                if (productError) {
                    console.error('Error fetching products:', productError);
                    setError('Failed to load seller products.');
                } else {
                    const fetchedProducts = productData.map((p: any) => ({...p, sellerId: p.seller_uid, imageUrls: p.image_urls || [] }));
                    setProducts(fetchedProducts as Product[]);
                }
                setLoading(false);
            };

            fetchSellerData();
        }
    }, [sellerId]);

    if (loading) {
         return (
             <div className="space-y-6">
                <Skeleton className="h-12 w-48" />
                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-20 w-20 rounded-full" />
                        <div className="space-y-2">
                             <Skeleton className="h-6 w-48" />
                             <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                </Card>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-48 w-full" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
     if (error) {
        return (
            <Alert variant="destructive" className="max-w-lg mx-auto">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-8">
             <div className="mb-6">
                <Button variant="outline" asChild>
                    <Link href={backLink}>
                        <ChevronLeft className="mr-2 h-4 w-4"/>
                        {backText}
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-6">
                        <Avatar className="h-24 w-24 border-2 border-primary">
                            <AvatarImage src={seller?.avatar_url || ''} alt={seller?.display_name || ''} />
                            <AvatarFallback className="text-3xl bg-secondary">
                                {seller?.display_name?.charAt(0).toUpperCase() || <User />}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-3xl font-headline">{seller?.display_name}</h1>
                             {seller?.phone_number && (
                                 <a href={`tel:${seller.phone_number}`} className="flex items-center gap-2 text-muted-foreground mt-2 hover:text-primary">
                                    <Phone className="h-4 w-4"/>
                                    {seller.phone_number}
                                 </a>
                             )}
                        </div>
                    </div>
                </CardHeader>
            </Card>
            
            <h2 className="text-2xl font-bold font-headline">Items from {seller?.display_name}</h2>

            {products.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-lg border">
                    <Frown className="mx-auto h-24 w-24 text-muted-foreground" />
                    <h2 className="mt-4 text-2xl font-semibold">No Items Listed</h2>
                    <p className="mt-2 text-muted-foreground">This seller doesn't have any active listings right now.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map(product => (
                       <ProductCard key={product.id} product={product} sourcePage="products" />
                    ))}
                </div>
            )}
        </div>
    )
}
