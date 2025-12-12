
'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase';

const uploadImages = async (files: File[], userId: string): Promise<string[]> => {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not available.");
    }
    
    const uploadPromises = files.map(async (file) => {
      const filePath = `product-images/${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('product-images')
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      
      const { data: { publicUrl } } = supabaseAdmin.storage.from('product-images').getPublicUrl(filePath);
      if (!publicUrl) throw new Error(`Failed to get public URL for ${file.name}`);
      
      return publicUrl;
    });

    return Promise.all(uploadPromises);
};


export async function createProduct(formData: FormData) {
    const supabase = createClient();

    try {
        const userId = formData.get('userId') as string;
        if (!userId) {
            return { success: false, error: 'User is not authenticated.' };
        }
        
        let imageUrls: string[] = [];
        const imageFiles = formData.getAll('images') as File[];
        
        if (formData.get('type') === 'product' && imageFiles.length > 0 && imageFiles[0].size > 0) {
            imageUrls = await uploadImages(imageFiles, userId);
        }

        const name = formData.get('name') as string;
        const description = formData.get('description') as string;

        const productData = {
            name,
            description,
            price: Number(formData.get('price')),
            category: formData.get('category') as string,
            type: formData.get('type') as 'product' | 'service',
            condition: formData.get('type') === 'product' ? formData.get('condition') as 'new' | 'used' : 'na',
            image_urls: imageUrls,
            seller_uid: userId,
            location: formData.get('location') as string,
            delivery_option: formData.get('delivery_option') as 'none' | 'paid' | 'free' | 'based_on_location',
            delivery_price: formData.get('delivery_option') === 'paid' ? Number(formData.get('delivery_price')) : null,
            status: 'approved' as const,
            quantity: formData.get('type') === 'product' ? Number(formData.get('quantity')) : null,
            is_unlimited: formData.get('type') === 'product' ? formData.get('is_unlimited') === 'on' : true,
        };

        const { data: newProduct, error: insertError } = await supabase
            .from('products')
            .insert(productData)
            .select()
            .single();

        if (insertError) throw insertError;

        revalidatePath('/');
        revalidatePath('/sell');
        revalidatePath('/products');

        return { success: true, product: newProduct };

    } catch (error: any) {
        console.error("Create product action error:", error);
        return { success: false, error: error.message };
    }
}
