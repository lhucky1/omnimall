
"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Phone, ShoppingCart, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface ProductListItemProps {
  product: Product;
}

export default function ProductListItem({ product }: ProductListItemProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const { addToCart } = useCart();
    const imageUrl = product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : 'https://placehold.co/400x300.png';

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

  return (
    <Card className="w-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="flex">
            <Link href={`/products/${product.id}`} className="flex-shrink-0">
                <div className="relative h-32 w-32 sm:h-full sm:w-48">
                    <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                    data-ai-hint="product photo"
                    />
                    {product.isBoosted && <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">Boosted</Badge>}
                    {product.type === 'service' && <Badge variant="secondary" className="absolute top-2 left-2">Service</Badge>}
                    {isOutOfStock && 
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                            <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
                        </div>
                    }
                </div>
            </Link>
            <CardContent className="p-3 sm:p-4 flex-grow flex flex-col justify-between">
                <Link href={`/products/${product.id}`} className="flex-grow">
                     <p className="text-xs text-muted-foreground">{product.category}</p>
                    <h3 className="text-base font-semibold tracking-tight leading-snug mt-1 line-clamp-2">{product.name}</h3>
                </Link>
                <div className="flex items-end justify-between mt-2">
                    <p className="text-lg font-bold text-foreground">GHC {product.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2">
                        {!isOwnProduct ? (
                            <>
                                <Button size="icon" variant="outline" className="h-9 w-9" onClick={handleAddToCart} disabled={isOutOfStock}>
                                    {isOutOfStock ? <X className="h-4 w-4"/> : <ShoppingCart className="h-4 w-4" />}
                                </Button>
                            </>
                        ) : null}
                        <Button size="sm" asChild className="shrink-0">
                            <Link href={`/products/${product.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> View
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </div>
    </Card>
  );
}

    