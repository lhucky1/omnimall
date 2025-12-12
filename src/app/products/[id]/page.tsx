

"use client"

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Product } from '@/types';
import { Loader2, Phone, Package, ChevronLeft, CheckCircle, Eye, MapPin, X, ShoppingCart, Truck, User, Archive, Heart, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWishlist } from '@/contexts/WishlistContext';
import { getOrCreateConversation } from '@/app/actions/chat';

const supabase = createClient();

export default function ProductDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const backLink = from === 'home' ? '/' : '/?view=all';
  const backText = 'Back to All Products';

  useEffect(() => {
    const timer = setTimeout(() => {
        if (loading || authLoading) {
            setShowSlowLoadMessage(true);
        }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading, authLoading]);

  useEffect(() => {
    setIsWishlisted(wishlist.some(item => item.id === id));
  }, [wishlist, id]);

  useEffect(() => {
    const fetchProductData = async () => {
        if (!id) return;
        setLoading(true);

        try {
          // sessionStorage is only available in the browser
          if (typeof window !== 'undefined') {
            const viewedProductsSession = JSON.parse(sessionStorage.getItem('viewed_products') || '[]');
            if (!viewedProductsSession.includes(id)) {
              const { error: rpcError } = await supabase.rpc('increment_product_view', { p_product_id: id });
              if (rpcError) {
                  // Don't block the user, just log the error
                  console.error("Failed to increment view count:", rpcError);
              } else {
                  viewedProductsSession.push(id);
                  sessionStorage.setItem('viewed_products', JSON.stringify(viewedProductsSession));
              }
            }
          }
        } catch (e) {
          console.error("Could not increment product view", e);
        }
        
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`*, profiles (uid, display_name, phone_number, avatar_url)`)
          .eq('id', id)
          .single();
        
        if (productError) {
          console.error('Error fetching product:', productError);
          setError('Product not found or an error occurred.');
          setLoading(false);
          return;
        }

        setProduct(productData as Product);
        setLoading(false);
    };

    fetchProductData();
  }, [id]);

  const handleAddToCart = () => {
      if (!user) {
        toast({ title: "Please log in", description: "You need an account to add items to your cart.", variant: "destructive" });
        router.push('/login');
        return;
      }
      if (product) {
          addToCart(product);
      }
  }

  const handleWishlistToggle = () => {
    if (!user) {
        toast({ title: "Please log in", description: "You need an account to manage your wishlist.", variant: "destructive" });
        router.push('/login');
        return;
    }
    if (!product) return;

    if (isWishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const handleContactSeller = async () => {
    if (!user || !product || !product.seller_uid) {
        toast({ title: "Please log in", description: "You must be logged in to contact a seller.", variant: "destructive"});
        router.push('/login');
        return;
    }
    if(isOwnProduct) return;

    setIsCreatingChat(true);
    const result = await getOrCreateConversation({
        productId: product.id,
        sellerId: product.seller_uid,
    });
    setIsCreatingChat(false);

    if (result.success && result.conversationId) {
        router.push(`/chat/${result.conversationId}`);
    } else {
        toast({ title: "Error", description: result.error || "Could not start a conversation.", variant: "destructive"});
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center -mt-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
      </div>
    );
  }

  if (error || !product) {
    return (
        <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-destructive">{error || 'Product not found.'}</h2>
            <Button asChild variant="link" className="mt-4">
                <Link href="/?view=all">Go back to products</Link>
            </Button>
        </div>
    );
  }

  const isOwnProduct = user && product.seller_uid === user.uid;
  const isOutOfStock = product.type === 'product' && !product.is_unlimited && product.quantity !== null && product.quantity <= 0;

  const StockInfo = () => {
    if (product.type !== 'product') return null;

    let stockText: string;
    let stockClass: string = "text-foreground";

    if (isOutOfStock) {
        stockText = "Out of Stock";
        stockClass = "text-destructive font-bold";
    } else if (product.is_unlimited) {
        stockText = "In Stock";
        stockClass = "text-green-600 font-semibold";
    } else if (product.quantity !== null) {
        if (product.quantity < 5) {
            stockText = `Only ${product.quantity} left!`;
            stockClass = "text-destructive font-bold";
        } else {
            stockText = `${product.quantity} available`;
        }
    } else {
        return null;
    }
    
    return (
        <div className="flex items-center gap-2 text-muted-foreground">
            <Archive className="h-5 w-5 text-primary"/>
            <span>Stock: <span className={stockClass}>{stockText}</span></span>
        </div>
    );
};


  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
            <Button variant="outline" asChild>
                <Link href={backLink}>
                    <ChevronLeft className="mr-2 h-4 w-4"/>
                    {backText}
                </Link>
            </Button>
        </div>
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div className="relative">
            <Carousel className="w-full">
                <CarouselContent>
                {product.image_urls && product.image_urls.length > 0 ? product.image_urls.map((url, index) => (
                    <CarouselItem key={index}>
                        <Dialog>
                           <DialogTrigger asChild>
                             <Card className="overflow-hidden rounded-lg cursor-pointer">
                                <Image
                                src={url}
                                alt={`${product.name} image ${index + 1}`}
                                width={600}
                                height={600}
                                className="w-full h-auto object-cover aspect-square"
                                data-ai-hint="product photo"
                                />
                            </Card>
                           </DialogTrigger>
                           <DialogContent className="max-w-4xl w-full h-auto max-h-[90vh] p-2 sm:p-4 bg-transparent border-0 shadow-none">
                                <DialogTitle className="sr-only">{product.name} - Image {index + 1}</DialogTitle>
                                <DialogDescription className="sr-only">A larger view of the product image.</DialogDescription>
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <Image
                                        src={url}
                                        alt={`${product.name} image ${index + 1}`}
                                        width={1200}
                                        height={1200}
                                        className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-lg"
                                    />
                                    <DialogClose className="absolute -top-2 -right-2 sm:top-0 sm:right-0 rounded-full bg-background/80 p-1 text-foreground hover:bg-background transition-opacity z-50">
                                        <X className="h-6 w-6" />
                                        <span className="sr-only">Close</span>
                                    </DialogClose>
                                </div>
                           </DialogContent>
                        </Dialog>
                    </CarouselItem>
                )) : (
                    <CarouselItem>
                    <Card className="overflow-hidden rounded-lg">
                        <Image
                        src="https://placehold.co/600x600.png"
                        alt="Placeholder image"
                        width={600}
                        height={600}
                        className="w-full h-auto object-cover aspect-square"
                        />
                    </Card>
                    </CarouselItem>
                )}
                </CarouselContent>
                {product.image_urls && product.image_urls.length > 1 && <>
                    <CarouselPrevious className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10" />
                    <CarouselNext className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10" />
                </>}
            </Carousel>
        </div>

        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-start">
            <div>
                <Badge variant="secondary" className="mb-2">{product.category}</Badge>
                <h1 className="text-3xl lg:text-4xl font-bold font-headline">{product.name}</h1>
                <div className="mt-2 flex items-center gap-4">
                    <p className="text-3xl font-bold text-primary">GHC {product.price.toFixed(2)}</p>
                </div>
            </div>
             <div className="flex items-center gap-2 text-muted-foreground mt-2 flex-shrink-0">
                <Eye className="h-5 w-5" />
                <span>{product.view_count || 0} views</span>
            </div>
          </div>
          
          <Card>
            <CardHeader>
                <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-5 w-5 text-primary"/>
                    <span>Type: <Badge>{product.type}</Badge></span>
                </div>
                {product.type === 'product' && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                       <CheckCircle className="h-5 w-5 text-primary"/>
                       <span>Condition: <Badge>{product.condition}</Badge></span>
                    </div>
                )}
                 {product.delivery_option === 'paid' && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                       <Truck className="h-5 w-5 text-primary"/>
                       <span>Delivery available for <span className="font-semibold text-foreground">GHC {Number(product.delivery_price).toFixed(2)}</span></span>
                    </div>
                )}
                {product.delivery_option === 'free' && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                       <Truck className="h-5 w-5 text-primary"/>
                       <span className="font-semibold text-foreground">Free delivery available</span>
                    </div>
                )}
                {product.delivery_option === 'based_on_location' && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Truck className="h-5 w-5 text-primary"/>
                        <span className="font-semibold text-foreground">Delivery based on location</span>
                    </div>
                )}
                <StockInfo />
            </CardContent>
          </Card>

          <div>
            <h3 className="font-semibold text-lg mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
          </div>

          <Card className="bg-secondary/50">
            <CardHeader>
                <CardTitle className="text-xl">Seller Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                 <Link href={`/sellers/${product.profiles?.uid}?from=products`} className="flex items-center gap-3 group">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={product.profiles?.avatar_url || ''} />
                        <AvatarFallback>{product.profiles?.display_name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium group-hover:underline text-primary">
                        {product.profiles?.display_name || 'Seller has no display name'}
                    </span>
                 </Link>
                {product.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-5 w-5" />
                        <span>Pickup at: {product.location}</span>
                    </div>
                )}
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-2">
            {!isOwnProduct ? (
                <>
                <Button size="lg" className="w-full" onClick={handleContactSeller} disabled={isCreatingChat}>
                   {isCreatingChat ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <MessageSquare className="mr-2 h-5 w-5" />}
                   {isCreatingChat ? 'Starting Chat...' : 'Chat with Seller'}
                </Button>
                <Button size="lg" className="w-full" onClick={handleAddToCart} disabled={isOutOfStock} variant="outline">
                    {isOutOfStock ? <><X className="mr-2 h-5 w-5"/>Out of Stock</> : <><ShoppingCart className="mr-2 h-5 w-5" />Add to Cart</>}
                </Button>
                 <Button size="lg" variant="outline" className="shrink-0 px-3" onClick={handleWishlistToggle}>
                    <Heart className={cn("h-5 w-5", isWishlisted && "fill-destructive text-destructive")} />
                </Button>
                </>
            ) : (
                 <Button size="lg" className="w-full" disabled>
                    This is your product
                </Button>
            )}
          </div>
        </div>
      </div>
      
      <Separator className="my-12" />

    </div>
  );
}

    