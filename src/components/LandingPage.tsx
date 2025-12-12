
'use client';

import type { Product, UserProfile } from "@/types";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "./ui/carousel";
import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { productCategories } from "@/app/lib/product-categories";
import { Card } from "./ui/card";
import Autoplay from "embla-carousel-autoplay";
import SellerCard from "./SellerCard";
import { cn } from "@/lib/utils";
import type { MerchandisedContent } from "@/app/actions/merchandising";
import ProductCard from "./ProductCard";

const HeroSlider = ({ products }: { products: Product[] }) => {
    const plugin = useRef(
        Autoplay({ delay: 4000, stopOnInteraction: true })
    );
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)

    useEffect(() => {
        if (!api) return;
        setCurrent(api.selectedScrollSnap());
        api.on("select", () => setCurrent(api.selectedScrollSnap()));
        return () => { api.off("select", () => {}) };
    }, [api])

    const scrollTo = useCallback((index: number) => api?.scrollTo(index), [api]);

    if (products.length === 0) return null;

    return (
        <Carousel 
            setApi={setApi}
            plugins={[plugin.current]}
            className="w-full relative"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
        >
            <CarouselContent>
                {products.map((product) => (
                     <CarouselItem key={product.id}>
                         <Link href={`/products/${product.id}?from=home`} className="relative rounded-lg overflow-hidden shadow-lg block">
                            <div className="relative w-full aspect-[21/9] bg-secondary overflow-hidden">
                                <Image 
                                    src={product.image_urls?.[0] || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"}
                                    alt={product.name}
                                    fill 
                                    className="object-cover" 
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                                <div className="absolute bottom-0 left-0 p-4 sm:p-6 md:p-8 text-white">
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-headline max-w-xl">{product.name}</h1>
                                    <p className="mt-1 sm:mt-2 text-lg max-w-xl">Now available for GHC {product.price.toFixed(2)}!</p>
                                    <Button asChild className="mt-4">
                                        <span tabIndex={-1}>View Details</span>
                                    </Button>
                                </div>
                            </div>
                        </Link>
                    </CarouselItem>
                ))}
            </CarouselContent>
            {products.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-2">
                    {products.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => scrollTo(index)}
                            className={cn("h-2 w-2 rounded-full bg-white/50 transition-all", current === index ? "w-4 bg-white" : "hover:bg-white/80")}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </Carousel>
    );
}

const SellerCarousel = ({ title, sellers }: { title: string, sellers: (Product | UserProfile)[] }) => {
    if (!sellers || sellers.length === 0) return null;
    return (
        <div className="space-y-4 py-6">
            <div className="flex items-center justify-between px-2 sm:px-0">
                <h2 className="text-2xl font-bold font-headline">{title}</h2>
            </div>
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
                <CarouselContent className="-ml-2 md:-ml-4">
                    {sellers.map((seller) => (
                        <CarouselItem key={'uid' in seller ? seller.uid : seller.id} className="basis-2/5 md:basis-1/4 lg:basis-1/6 pl-2 md:pl-4">
                            <SellerCard seller={seller as UserProfile} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
            </Carousel>
        </div>
    )
}


interface LandingPageProps {
  allProducts: Product[];
  merchandisedContent: MerchandisedContent;
  loading: boolean;
}

const LandingPage = ({ allProducts, merchandisedContent, loading }: LandingPageProps) => {

    const { sliderProducts, topSellers } = useMemo(() => {
        return {
            sliderProducts: (merchandisedContent?.['hero_slider'] as Product[]) || [],
            topSellers: (merchandisedContent?.['top_sellers'] as UserProfile[]) || [],
        }
    }, [merchandisedContent]);
    
    if (loading) {
         return (
             <div className="space-y-8">
                 <Skeleton className="h-64 w-full" />
                 <div className="grid grid-cols-4 gap-4 px-2 sm:px-0">
                     {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                 </div>
                 <Skeleton className="h-80 w-full" />
             </div>
        );
    }
    
    return (
        <div className="space-y-4 sm:space-y-8">
            <HeroSlider products={sliderProducts.length > 0 ? sliderProducts : allProducts.slice(0, 5)} />
            
            {topSellers.length > 0 && (
                <SellerCarousel title="Top Sellers" sellers={topSellers} />
            )}
            
             <div className="px-2 sm:px-0">
                <h2 className="text-xl sm:text-2xl font-bold font-headline mb-4">Shop by Category</h2>
                <div className="grid grid-cols-4 gap-2 sm:gap-4">
                    {productCategories.map(category => (
                        <Link href={`/?category=${category.value}`} key={category.value} className="group text-center">
                            <Card className="overflow-hidden aspect-square flex items-center justify-center p-2 group-hover:shadow-lg transition-shadow">
                                <category.icon className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
                            </Card>
                            <p className="mt-2 text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors truncate">{category.label}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
};

export default LandingPage;
