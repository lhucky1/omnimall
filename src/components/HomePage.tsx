

'use client';

import type { Product, UserProfile } from "@/types";
import { useMemo, useRef } from "react";
import ProductCard from "./ProductCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { ArrowRight, User } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { productCategories } from "@/app/lib/product-categories";
import { Card } from "./ui/card";
import Autoplay from "embla-carousel-autoplay";
import SellerCard from "./SellerCard";

const HeroSlider = ({ products }: { products: Product[] }) => {
    const plugin = useRef(
        Autoplay({ delay: 4000, stopOnInteraction: true })
    );

    if (products.length === 0) return null;

    return (
        <Carousel 
            plugins={[plugin.current]}
            className="w-full"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
        >
            <CarouselContent>
                {products.map((product) => (
                     <CarouselItem key={product.id}>
                         <div className="relative rounded-lg overflow-hidden shadow-lg">
                            <div className="relative w-full aspect-[21/9] sm:aspect-[21/7] bg-secondary overflow-hidden">
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
                                        <Link href={`/products/${product.id}`}>View Details</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    );
}

const CategoryCarousel = ({ title, category, products }: { title: string, category: string, products: Product[] }) => {
    if (products.length === 0) return null;
    return (
        <div className="space-y-4 py-6">
            <div className="flex items-center justify-between px-2 sm:px-0">
                <h2 className="text-2xl font-bold font-headline">{title}</h2>
                <Button variant="link" asChild>
                    <Link href={`/products?category=${category}`}>See all <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
                <CarouselContent className="-ml-2 md:-ml-4">
                    {products.map((product) => (
                        <CarouselItem key={product.id} className="basis-1/2 md:basis-1/3 lg:basis-1/4 pl-2 md:pl-4">
                            <ProductCard product={product} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
            </Carousel>
        </div>
    )
}

const SellerCarousel = ({ title, sellers }: { title: string, sellers: UserProfile[] }) => {
    if (sellers.length === 0) return null;
    return (
        <div className="space-y-4 py-6">
            <div className="flex items-center justify-between px-2 sm:px-0">
                <h2 className="text-2xl font-bold font-headline">{title}</h2>
            </div>
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
                <CarouselContent className="-ml-2 md:-ml-4">
                    {sellers.map((seller) => (
                        <CarouselItem key={seller.uid} className="basis-2/5 md:basis-1/4 lg:basis-1/6 pl-2 md:pl-4">
                            <SellerCard seller={seller} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
            </Carousel>
        </div>
    )
}

const PromoBanner = ({ title, product }: { title: string, product: Product }) => (
    <div className="w-full my-6">
        <div className="fade-in-up relative aspect-[16/9] md:aspect-[21/9] w-full overflow-hidden rounded-lg bg-secondary">
             <Image src={product.image_urls?.[0] || 'https://placehold.co/1200x400.png'} alt={product.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent p-6 md:p-12 flex flex-col justify-center">
                <h2 className="text-2xl md:text-4xl font-bold text-white font-headline max-w-md">{title}</h2>
                <p className="text-lg text-white/90 mt-2 max-w-md">{product.name}</p>
                <Button asChild className="mt-6 w-fit">
                    <Link href={`/products/${product.id}`}>Check it Out</Link>
                </Button>
            </div>
        </div>
    </div>
);


const LandingPage = ({ products, loading }: { products: Product[], loading: boolean }) => {

    const { sliderProducts, topDeals, techAndAccessories, campusFashion, bestSellers } = useMemo(() => {
        const shuffled = [...products].sort(() => 0.5 - Math.random());
        return {
            sliderProducts: shuffled.slice(0, 5),
            topDeals: shuffled.filter(p => p.price < 100).slice(0, 8),
            techAndAccessories: shuffled.filter(p => p.category === 'electronics').slice(0, 8),
            campusFashion: shuffled.filter(p => p.category === 'fashion').slice(0, 8),
            bestSellers: [], 
        }
    }, [products]);
    
    if (loading) {
         return (
             <div className="space-y-8">
                 <Skeleton className="h-64 w-full" />
                 <div className="grid grid-cols-4 gap-4">
                     {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                 </div>
                 <Skeleton className="h-80 w-full" />
             </div>
        );
    }
    
    // Dynamic Layout Logic
    const sections: JSX.Element[] = [];
    
    const sellerProfiles = products.slice(0, 8).map(p => p.profiles).filter((p): p is UserProfile => !!p);
    const uniqueSellers = Array.from(new Map(sellerProfiles.map(s => [s.uid, s])).values());


    if (uniqueSellers.length > 0) sections.push(<SellerCarousel key="best-sellers" title="Top Sellers" sellers={uniqueSellers} />);
    if (products[0]) sections.push(<PromoBanner key="promo-1" title="🔥 Featured Item" product={products[0]} />);
    
    if (techAndAccessories.length > 0) sections.push(<CategoryCarousel key="tech" title="Tech & Accessories" category="electronics" products={techAndAccessories} />);
    
    if (products[6]) sections.push(<PromoBanner key="promo-2" title="⏰ Limited Time Offer" product={products[6]} />);
    
    if (campusFashion.length > 0) sections.push(<CategoryCarousel key="fashion" title="Campus Fashion" category="fashion" products={campusFashion} />);
    
    if (products.slice(7).length > 0) {
        sections.push(
            <div key="final-grid" className="my-6">
                 <h2 className="text-2xl font-bold font-headline mb-4">More to Explore</h2>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {products.slice(7, 15).map(p => <ProductCard key={p.id} product={p} />)}
                </div>
            </div>
        )
    }
    

    return (
        <div className="space-y-4 sm:space-y-8">
            <HeroSlider products={sliderProducts} />
            
             <div className="px-2 sm:px-0">
                <h2 className="text-xl sm:text-2xl font-bold font-headline mb-4">Shop by Category</h2>
                <div className="grid grid-cols-4 gap-2 sm:gap-4">
                    {productCategories.map(category => (
                        <Link href={`/products?category=${category.value}`} key={category.value} className="group text-center">
                            <Card className="overflow-hidden aspect-square flex items-center justify-center p-2 group-hover:shadow-lg transition-shadow">
                                <category.icon className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
                            </Card>
                            <p className="mt-2 text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors truncate">{category.label}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {sections}
            
        </div>
    )
};

export default LandingPage;
