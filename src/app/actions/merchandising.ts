
"use server";

import type { Product, UserProfile } from "@/types";

export interface MerchandisedContent {
    hero_slider: Product[];
    featured_items: Product[];
    top_sellers: UserProfile[];
    limited_time_offer: Product[];
}

export async function getMerchandisedContent(allProducts: Product[]): Promise<MerchandisedContent> {
    const products = [...allProducts];

    // Helper to get unique items
    const getUnique = <T, K>(items: T[], key: (item: T) => K): T[] => {
        return [...new Map(items.map(item => [key(item), item])).values()];
    };

    // 1. Hero Slider: Newest, boosted, or random items
    const hero_slider = products
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    // 2. Featured Items: Explicitly boosted items, or fall back to high-priced items
    const featured_items = products
        .filter(p => p.isBoosted)
        .sort(() => 0.5 - Math.random()) // Shuffle boosted items
        .slice(0, 2);

    if (featured_items.length < 2) {
        const fallback = products
            .filter(p => !p.isBoosted)
            .sort((a, b) => b.price - a.price)
            .slice(0, 2 - featured_items.length);
        featured_items.push(...fallback);
    }
    
    // 3. Top Sellers: Extract unique sellers from recent products
    const recentSellers = products
        .slice(0, 20) // Look at 20 most recent products
        .map(p => p.profiles)
        .filter((p): p is UserProfile => !!p && p.is_verified_seller === true);

    const top_sellers = getUnique(recentSellers, seller => seller.uid).slice(0, 10);

    // 4. Limited Time Offer: Just pick a random item for now
    const limited_time_offer = products.length > 0 ? [products[Math.floor(Math.random() * products.length)]] : [];


    return {
        hero_slider: getUnique(hero_slider, p => p.id),
        featured_items: getUnique(featured_items, p => p.id),
        top_sellers,
        limited_time_offer: getUnique(limited_time_offer, p => p.id),
    };
}
