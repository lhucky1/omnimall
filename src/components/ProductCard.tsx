
"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, X, Archive } from "lucide-react";
import { Badge } from "./ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useWishlist } from "@/contexts/WishlistContext";
import { useEffect, useState } from "react";

interface ProductCardProps {
  product: Product;
  className?: string;
  sourcePage?: 'home' | 'products';
}

export default function ProductCard({ product, className, sourcePage = 'products' }: ProductCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const imageUrl = product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : 'https://placehold.co/400x300.png';

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
     <div className={cn("fade-in-up group relative flex w-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1", className)}>
      <Link href={`/products/${product.id}?from=${sourcePage}`} className="flex flex-col h-full">
        <div className="relative overflow-hidden">
           <div className={cn("aspect-[4/5] w-full", isOutOfStock && "opacity-50")}>
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                data-ai-hint="product photo"
              />
           </div>
           {product.isBoosted && !isOutOfStock && <Badge className="absolute top-2 left-2 z-10 bg-accent text-accent-foreground">Featured</Badge>}
           {isOutOfStock && (
               <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                   <Badge variant="destructive" className="text-sm">OUT OF STOCK</Badge>
               </div>
           )}
           {!isOwnProduct && (
              <Button size="icon" variant="secondary" className="absolute top-2 right-2 z-20 h-8 w-8 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background" onClick={handleWishlistToggle}>
                  <Heart className={cn("h-4 w-4 text-foreground/70", isWishlisted && "fill-destructive text-destructive")}/>
              </Button>
            )}
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h3 className="text-sm font-semibold leading-tight tracking-tight line-clamp-2">{product.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{product.category}</p>
          <div className="flex-grow" />
          <div className="mt-auto flex items-end justify-between pt-2">
            <p className="text-base font-bold text-foreground">GHC {product.price.toFixed(2)}</p>
             {!isOwnProduct && (
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleAddToCart} disabled={isOutOfStock}>
                {isOutOfStock ? <X className="h-4 w-4"/> : <ShoppingCart className="h-4 w-4" />}
                <span className="sr-only">Add to Cart</span>
              </Button>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

    