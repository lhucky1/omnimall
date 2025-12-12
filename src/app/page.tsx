
'use server';

import type { Product } from "@/types";
import { getMerchandisedItems, type MerchandisedContent } from "@/app/actions/merchandising";
import { createClient } from "@/lib/supabase";
import HomePageContent from "./HomePageContent";

export default async function HomePage() {
    const supabase = createClient();
    let allProducts: Product[] = [];
    let merchandisedContent: MerchandisedContent = {};
    let error: string | null = null;
    
    try {
        const contentResultPromise = getMerchandisedItems();
        const productsPromise = supabase
            .from('products')
            .select('*, profiles(*)')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        const [contentResult, { data: productsData, error: productsError }] = await Promise.all([contentResultPromise, productsPromise]);
        
        if (contentResult.error) throw new Error(contentResult.error);
        if (productsError) throw productsError;
        
        merchandisedContent = contentResult.data || {};
        allProducts = productsData as Product[];

    } catch (err: any) {
        console.error('Error fetching homepage data:', err);
        error = 'Failed to load page content. Please try again later.';
    }

    if (error) {
        return <div className="text-center py-20 text-destructive">{error}</div>;
    }

    return (
      <HomePageContent 
        initialProducts={allProducts} 
        merchandisedContent={merchandisedContent} 
      />
    )
}
