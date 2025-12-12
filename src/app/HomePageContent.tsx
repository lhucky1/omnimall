
"use client";

import { useState, useMemo, useEffect, Suspense, useRef } from "react";
import type { Product } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Frown, Filter, Search, X, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Fuse from 'fuse.js';
import ProductCard from "@/components/ProductCard";
import { useSearchParams } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import ProductListItem from "@/components/ProductListItem";
import { cn } from "@/lib/utils";
import LandingPage from "@/components/LandingPage";
import { type MerchandisedContent } from "@/app/actions/merchandising";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import FeaturedProductCard from "@/components/FeaturedProductCard";

interface HomePageContentProps {
    initialProducts: Product[];
    merchandisedContent: MerchandisedContent;
}

function HomePageContentComponent({ initialProducts, merchandisedContent }: HomePageContentProps) {
    const searchParams = useSearchParams()
    const categoryParam = searchParams.get('category');
    const queryParam = searchParams.get('q');
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortOption, setSortOption] = useState('default');
    const [searchTerm, setSearchTerm] = useState(queryParam || "");
    const [categoryFilter, setCategoryFilter] = useState(categoryParam || 'all');
    const [conditionFilter, setConditionFilter] = useState('all');
    const [categories, setCategories] = useState<string[]>([]);
    const [fuse, setFuse] = useState<Fuse<Product> | null>(null);
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const [isSearchFocused, setIsSearchFocused] = useState(false);

     useEffect(() => {
        if(categoryParam) {
            setCategoryFilter(categoryParam);
        }
        if(queryParam) {
            setSearchTerm(queryParam);
        }
    }, [categoryParam, queryParam]);

    useEffect(() => {
        setLoading(true);
        const merchandisedProductIds = new Set([
            ...(merchandisedContent['featured_items']?.map(p => p.id) || []),
            ...(merchandisedContent['limited_time_offer']?.map(p => p.id) || []),
        ]);
    
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
        const newProducts: Product[] = [];
        const oldProducts: Product[] = [];
    
        initialProducts.forEach(p => {
            if (new Date(p.created_at) > oneDayAgo) {
                newProducts.push(p);
            } else {
                oldProducts.push(p);
            }
        });
    
        for (let i = oldProducts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [oldProducts[i], oldProducts[j]] = [oldProducts[j], oldProducts[i]];
        }
    
        const combinedProducts = [...newProducts, ...oldProducts];
    
        const allProductsWithBoost = combinedProducts.map(p => ({
            ...p,
            isBoosted: merchandisedProductIds.has(p.id)
        }));
    
        setProducts(allProductsWithBoost);
        
        const uniqueCategories = [...new Set(initialProducts.map((p: Product) => p.category))];
        setCategories(uniqueCategories);
    
        setFuse(new Fuse(allProductsWithBoost, {
            keys: ['name', 'description', 'category', 'search_tags'],
            includeScore: true,
            threshold: 0.4,
        }));
        setLoading(false);
    }, [initialProducts, merchandisedContent]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchContainerRef]);

    const clearFilters = () => {
        setCategoryFilter('all');
        setConditionFilter('all');
    };

    const searchResults = useMemo(() => {
        if (!searchTerm || !fuse) return [];
        return fuse.search(searchTerm).map(result => result.item).slice(0, 10);
    }, [searchTerm, fuse]);


    const sortedAndFilteredProducts = useMemo(() => {
        let productSource = products;
        let filteredProducts;

        if (searchTerm && fuse) {
            filteredProducts = fuse.search(searchTerm).map(result => result.item);
        } else {
            filteredProducts = productSource;
        }

        let filtered = filteredProducts.filter(product => 
            (categoryFilter === 'all' || product.category === categoryFilter) &&
            (conditionFilter === 'all' || product.condition === conditionFilter)
        );

        const boostedItems = filtered.filter(p => p.isBoosted);
        const nonBoostedItems = filtered.filter(p => !p.isBoosted);

        switch (sortOption) {
            case 'price_asc':
                nonBoostedItems.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                nonBoostedItems.sort((a, b) => b.price - a.price);
                break;
            case 'name_asc':
                nonBoostedItems.sort((a, b) => a.name.localeCompare(b.name));
                break;
            default:
                break;
        }
        
        return [...boostedItems, ...nonBoostedItems];

    }, [searchTerm, fuse, products, categoryFilter, conditionFilter, sortOption]);

    const FilterContent = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="category-filter">Category</Label>
                <Select onValueChange={setCategoryFilter} value={categoryFilter}>
                    <SelectTrigger id="category-filter"><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="condition-filter">Condition</Label>
                <Select onValueChange={setConditionFilter} value={conditionFilter}>
                    <SelectTrigger id="condition-filter"><SelectValue placeholder="Select Condition" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Conditions</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
    
    const showSearchResultsOverlay = isSearchFocused && searchTerm.length > 0 && searchResults.length > 0;
    const featuredProduct = sortedAndFilteredProducts.length > 0 ? sortedAndFilteredProducts[0] : null;
    const otherProducts = sortedAndFilteredProducts.length > 1 ? sortedAndFilteredProducts.slice(1) : [];

    const ProductGridSkeleton = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-2 space-y-3">
                <Skeleton className="h-full aspect-video sm:aspect-square" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                    <Skeleton className="h-48" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-4 sm:space-y-8">
             <div className="px-2 sm:px-0 pt-8">
                <div className="relative w-full max-w-xl mx-auto" ref={searchContainerRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                    <Input
                        placeholder="Search for anything..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        className="w-full pl-10 h-12 text-base rounded-full placeholder:text-primary/70 border-2 border-primary focus-visible:ring-primary/50"
                    />
                    {showSearchResultsOverlay && (
                         <div className="absolute top-full mt-2 w-full z-50">
                            <Card className="max-h-[60vh] overflow-y-auto">
                                 <div className="p-2 space-y-1">
                                    {searchResults.map(product => (
                                        <Link 
                                            key={product.id}
                                            href={`/products/${product.id}`}
                                            className="block p-2 rounded-md hover:bg-muted"
                                            onClick={() => setIsSearchFocused(false)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
                                                    <Image
                                                        src={product.image_urls?.[0] || 'https://placehold.co/100x100.png'}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="flex-grow">
                                                    <p className="font-semibold text-sm truncate">{product.name}</p>
                                                    <p className="text-xs text-muted-foreground">GHC {product.price.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            <LandingPage allProducts={initialProducts} merchandisedContent={merchandisedContent} loading={loading} />
        
            <div className="bg-card p-4 rounded-none sm:rounded-lg shadow-sm border-y sm:border">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 id="product-grid-title" className="text-2xl font-bold font-headline self-start sm:self-center scroll-m-20">
                        {categoryFilter !== 'all' ? `${categoryFilter}` : 'All Products'}
                    </h1>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                         <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto">
                                    <Filter className="mr-2 h-4 w-4" />
                                    Filter
                                </Button>
                            </SheetTrigger>
                            <SheetContent side={isDesktop ? "left" : "bottom"}>
                                <SheetHeader>
                                    <SheetTitle>Filter Products</SheetTitle>
                                </SheetHeader>
                                <div className="py-4">
                                    <FilterContent />
                                </div>
                                <SheetFooter>
                                    <SheetClose asChild><Button className="w-full">Done</Button></SheetClose>
                                </SheetFooter>
                            </SheetContent>
                         </Sheet>

                        <div className="w-full sm:w-auto">
                            <Select onValueChange={setView} value={view}>
                                <SelectTrigger className="w-[100px] hidden md:flex">
                                    <SelectValue placeholder="View" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="grid">Grid</SelectItem>
                                    <SelectItem value="list">List</SelectItem>
                                </SelectContent>
                            </Select>
                             <div className="flex md:hidden gap-1">
                                <Button variant={view === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setView('grid')}>
                                    <LayoutGrid className="h-4 w-4"/>
                                </Button>
                                <Button variant={view === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setView('list')}>
                                    <List className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>

                        <div className="w-full sm:w-[180px]">
                        <Select onValueChange={setSortOption} defaultValue="default">
                            <SelectTrigger>
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">Default</SelectItem>
                                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                                <SelectItem value="name_asc">Name: A to Z</SelectItem>
                            </SelectContent>
                        </Select>
                        </div>
                    </div>
                </div>
                {(categoryFilter !== 'all' || conditionFilter !== 'all') && (
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                        {categoryFilter !== 'all' && <Badge variant="secondary" className="text-base capitalize">Category: {categoryFilter}</Badge>}
                        {conditionFilter !== 'all' && <Badge variant="secondary" className="text-base capitalize">Condition: {conditionFilter}</Badge>}
                        <Button variant="ghost" size="sm" className="h-auto p-1 text-primary hover:text-primary" onClick={clearFilters}>
                            <X className="mr-1 h-3 w-3"/> Clear All
                        </Button>
                    </div>
                )}
            </div>

            <div className="px-2 sm:px-0">
                {loading ? (
                    <ProductGridSkeleton />
                ) : sortedAndFilteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-lg border">
                        <Frown className="mx-auto h-24 w-24 text-muted-foreground" />
                        <h2 className="mt-4 text-2xl font-semibold">No Products Found</h2>
                        <p className="mt-2 text-muted-foreground">Your search or filter criteria did not match any products.</p>
                    </div>
                ) : (
                    <div className={cn(view === 'list' && "space-y-4")} aria-labelledby="product-grid-title">
                       {view === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {featuredProduct && (
                                     <FeaturedProductCard 
                                        product={featuredProduct}
                                        className="col-span-2 md:col-span-2"
                                     />
                                )}
                                {otherProducts.map(product => 
                                    <ProductCard 
                                        key={product.id} 
                                        product={product} 
                                        sourcePage="products" 
                                    />
                                )}
                            </div>
                        ) : (
                            sortedAndFilteredProducts.map(product => 
                                <ProductListItem key={product.id} product={product} />
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function HomePageContent(props: HomePageContentProps) {
    return (
        <Suspense fallback={<div className="flex flex-col items-center justify-center h-screen -mt-20"><Skeleton className="w-full h-64" /></div>}>
            <HomePageContentComponent {...props} />
        </Suspense>
    )
}
