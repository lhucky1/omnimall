
"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ShoppingCart, X, Heart } from "lucide-react";
import { Badge } from "./ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useWishlist } from "@/contexts/WishlistContext";
import { useEffect, useState } from "react";

interface FeaturedProductCardProps {
  product: Product;
  className?: string;
  sourcePage?: 'home' | 'products';
}

export default function FeaturedProductCard({ product, className, sourcePage = 'products' }: FeaturedProductCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const imageUrl = product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : 'https://placehold.co/800x600.png';

  useEffect(() => {
    setIsWishlisted(wishlist.some(item => item.id === product.id));
  }, [wishlist, product.id]);

  const isOwnProduct = user && product.seller_uid === user.uid;
  const isOutOfStock = product.type === 'product' && !product.is_unlimited && product.quantity !== null && product.quantity <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
        toast({ title: "Please log in", description: "You need to be logged in to add items to your cart.", variant: "destructive" });
        router.push('/login');
        return;
    }
    if (isOutOfStock) {
        toast({ title: "Out of Stock", description: "This item is currently unavailable.", variant: "destructive"});
        return;
    }
    addToCart(product);
  }

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
     if (!user) {
        toast({ title: "Please log in", description: "You need an account to manage your wishlist.", variant: "destructive" });
        router.push('/login');
        return;
    }
    if (isWishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  return (
    <Card className={cn("group w-full overflow-hidden transition-all duration-300 hover:shadow-xl", className)}>
        <Link href={`/products/${product.id}?from=${sourcePage}`} className="flex flex-col sm:flex-row h-full">
            <div className="relative w-full sm:w-1/2 flex-shrink-0">
                <div className={cn("aspect-video sm:aspect-square w-full", isOutOfStock && "opacity-50")}>
                    <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        data-ai-hint="product photo featured"
                    />
                </div>
                {product.isBoosted && !isOutOfStock && <Badge className="absolute top-2 left-2 z-10 bg-accent text-accent-foreground">Featured</Badge>}
                {isOutOfStock && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                        <Badge variant="destructive" className="text-sm">OUT OF STOCK</Badge>
                    </div>
                )}
            </div>
            <CardContent className="p-4 flex flex-1 flex-col justify-between">
                <div>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                    <h3 className="text-lg font-semibold leading-tight tracking-tight mt-1 line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mt-2">{product.description}</p>
                </div>
                <div className="flex-grow" />
                <div className="mt-4 flex items-center justify-between pt-2">
                    <p className="text-2xl font-bold text-foreground">GHC {product.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2">
                         {!isOwnProduct && (
                            <Button size="icon" variant="outline" className="h-9 w-9" onClick={handleWishlistToggle}>
                                <Heart className={cn("h-4 w-4", isWishlisted && "fill-destructive text-destructive")}/>
                            </Button>
                         )}
                         <Button size="sm" asChild>
                            <span className="flex items-center">
                                View Item <ArrowRight className="ml-2 h-4 w-4" />
                            </span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Link>
    </Card>
  );
}
