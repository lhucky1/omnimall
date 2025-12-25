
import { createClient } from '@/lib/supabase-server';
import HomePageContent from '@/app/HomePageContent';
import { getMerchandisedContent } from '@/app/actions/merchandising';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const revalidate = 300; // Revalidate data every 5 minutes

export default async function Page() {
  const supabase = createClient();

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*, profiles(uid, display_name, avatar_url, is_verified_seller)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (productsError) {
    console.error("Error fetching products:", productsError);
  }
  
  const merchandisedContent = await getMerchandisedContent(products || []);
  
  const ProductGridSkeleton = () => (
      <div className="space-y-8">
           <Skeleton className="h-64 w-full" />
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                      <Skeleton className="h-48" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <HomePageContent 
        initialProducts={products || []} 
        merchandisedContent={merchandisedContent} 
      />
    </Suspense>
  );
}
