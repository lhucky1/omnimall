
"use client";

import { useWishlist } from "@/contexts/WishlistContext";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

export default function WishlistPage() {
    const { wishlist, loading } = useWishlist();
    const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                setShowSlowLoadMessage(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [loading]);

    if (loading) {
        return (
             <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">My Wishlist</h1>
                <p className="text-muted-foreground">Your saved items for later.</p>
            </div>
            
            {wishlist.length === 0 ? (
                <div className="text-center py-20 border rounded-lg bg-card">
                    <Heart className="mx-auto h-24 w-24 text-muted-foreground" />
                    <h2 className="mt-4 text-2xl font-semibold">Your Wishlist is Empty</h2>
                    <p className="mt-2 text-muted-foreground">Browse products and save your favorites here.</p>
                    <Button asChild className="mt-6">
                        <Link href="/products">Discover Products</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {wishlist.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
}

    

    