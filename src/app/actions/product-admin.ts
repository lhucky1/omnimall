
'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

const deleteProductImages = async (imageUrls: string[]) => {
    if (!imageUrls || imageUrls.length === 0) return;
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        throw new Error("Supabase admin client not available.");
    }
    const filePaths = imageUrls.map(url => new URL(url).pathname.split('/public/product-images/')[1]).filter(Boolean);
    if (filePaths.length > 0) {
        const { error } = await supabaseAdmin.storage.from('product-images').remove(filePaths);
        if (error) {
            console.warn(`Could not delete images from storage: ${error.message}`);
        }
    }
}

export async function deleteProduct(productId: string, imageUrls: string[]) {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return { success: false, error: "Supabase admin client not initialized." };
    }
    try {
        await deleteProductImages(imageUrls);
        const { error } = await supabaseAdmin.from('products').delete().eq('id', productId);
        if (error) throw error;
        
        revalidatePath('/admin/products');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function updateProductAsAdmin(productId: string, values: any) {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return { success: false, error: "Supabase admin client not initialized." };
    }

    try {
        const { error } = await supabaseAdmin
            .from('products')
            .update({
                name: values.name,
                description: values.description,
                price: values.price,
                category: values.category,
                type: values.type,
                condition: values.type === 'product' ? values.condition : 'na',
                status: values.status,
            })
            .eq('id', productId);

        if (error) throw error;
        
        revalidatePath('/admin/products');
        revalidatePath(`/products/${productId}`);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
