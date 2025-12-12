
'use server';

import { createClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { Supplier, DropshippedProduct, Product } from '@/types';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = createClient();
const MAX_IMAGES = 5;

export async function getSuppliers(): Promise<{ data: Supplier[] | null; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        return { data, error: null };
    } catch (err: any) {
        return { data: null, error: err.message };
    }
}

export async function addOrUpdateSupplier(formData: FormData) {
    try {
        const id = formData.get('id') as string | null;

        const supplierData = {
            name: formData.get('name') as string,
            contact_name: (formData.get('contact_name') as string) || null,
            contact_email: (formData.get('contact_email') as string) || null,
            contact_phone: (formData.get('contact_phone') as string) || null,
        };

        if (id) {
            const { error } = await supabase.from('suppliers').update(supplierData).eq('id', id);
            if (error) throw error;
        } else {
            if (!supplierData.name) {
                return { success: false, error: 'Supplier name cannot be empty.' };
            }
            const { error } = await supabase.from('suppliers').insert(supplierData);
            if (error) throw error;
        }

        revalidatePath('/admin/dropshipping');
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSupplier(id: string) {
    try {
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) throw error;
        revalidatePath('/admin/dropshipping');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function getSupplierProducts(supplierId: string): Promise<{
    data: { supplier: Supplier, products: (DropshippedProduct & { product: Product | null })[] } | null;
    error: string | null;
}> {
    try {
        const { data: supplier, error: supplierError } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', supplierId)
            .single();

        if (supplierError) throw supplierError;

        const { data: products, error: productsError } = await supabase
            .from('dropshipped_products')
            .select('*, product:products(*)')
            .eq('supplier_id', supplierId)
            .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        return { data: { supplier, products: products as any[] }, error: null };

    } catch (err: any) {
        return { data: null, error: err.message };
    }
}


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


export async function addDropshippedProduct(formData: FormData) {
     const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return { success: false, error: "Supabase admin client not initialized." };
    }
    
    try {
        const seller_uid = formData.get('seller_uid') as string;
        if (!seller_uid) throw new Error('Seller ID is missing');

        // 1. Upload images first
        const imageFiles = formData.getAll('images') as File[];
        let imageUrls: string[] = [];
        if (imageFiles.length > 0 && imageFiles[0].size > 0) {
            imageUrls = await uploadImages(imageFiles, seller_uid);
        }

        const isUnlimited = formData.get('is_unlimited') === 'on';

        // 2. Create the main product listing
        const productData = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            price: Number(formData.get('price')),
            category: formData.get('category') as string,
            seller_uid: seller_uid,
            supplier_id: formData.get('supplier_id') as string,
            status: 'approved' as const,
            type: 'product' as const,
            condition: 'new' as const, // Dropshipped products are always new
            is_unlimited: isUnlimited,
            quantity: isUnlimited ? null : Number(formData.get('quantity')),
            image_urls: imageUrls,
            location: formData.get('location') as string,
            delivery_option: formData.get('delivery_option') as Product['delivery_option'],
            delivery_price: formData.get('delivery_option') === 'paid' ? Number(formData.get('delivery_price')) : null,
        };

        const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert(productData)
            .select()
            .single();

        if (productError) throw productError;

        // 3. Create the dropshipped_product record
        const dropshippedData = {
            name: productData.name,
            supplier_id: productData.supplier_id,
            cost_price: Number(formData.get('cost_price')),
            notes: (formData.get('notes') as string) || null,
            product_id: newProduct.id,
        };

        const { error: dropshipError } = await supabase
            .from('dropshipped_products')
            .insert(dropshippedData);

        if (dropshipError) {
            // Rollback: delete the product if dropship record fails
            await supabase.from('products').delete().eq('id', newProduct.id);
            if (imageUrls.length > 0) {
                 const filePaths = imageUrls.map(url => new URL(url).pathname.split('/public/product-images/')[1]).filter(Boolean);
                 await supabaseAdmin.storage.from('product-images').remove(filePaths);
            }
            throw dropshipError;
        }

        revalidatePath(`/admin/dropshipping/${productData.supplier_id}`);
        return { success: true };

    } catch (error: any) {
        console.error('Error adding dropshipped product:', error);
        return { success: false, error: error.message };
    }
}

export async function updateDropshippedProduct(formData: FormData) {
    try {
        const productId = formData.get('product_id') as string;
        const dropshippedProductId = formData.get('dropshipped_product_id') as string;
        if (!productId || !dropshippedProductId) throw new Error('Product IDs are missing.');

        const isUnlimited = formData.get('is_unlimited') === 'on';

        // Update main product table
        const productData = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            price: Number(formData.get('price')),
            category: formData.get('category') as string,
            is_unlimited: isUnlimited,
            quantity: isUnlimited ? null : Number(formData.get('quantity')),
            location: formData.get('location') as string,
            delivery_option: formData.get('delivery_option') as Product['delivery_option'],
            delivery_price: formData.get('delivery_option') === 'paid' ? Number(formData.get('delivery_price')) : null,
        };

        const { error: productError } = await supabase
            .from('products')
            .update(productData)
            .eq('id', productId);

        if (productError) throw productError;

        // Update dropshipped_products table
        const dropshippedData = {
            name: productData.name, // Keep name in sync
            cost_price: Number(formData.get('cost_price')),
            notes: (formData.get('notes') as string) || null,
        };

        const { error: dropshipError } = await supabase
            .from('dropshipped_products')
            .update(dropshippedData)
            .eq('id', dropshippedProductId);

        if (dropshipError) throw dropshipError;
        
        const supplierId = formData.get('supplier_id') as string;
        revalidatePath(`/admin/dropshipping/${supplierId}`);
        revalidatePath(`/products/${productId}`);

        return { success: true };
    } catch (error: any) {
        console.error('Error updating dropshipped product:', error);
        return { success: false, error: error.message };
    }
}


export async function deleteDropshippedProduct(id: string) {
    try {
        const { error } = await supabase.from('dropshipped_products').delete().eq('id', id);
        if (error) throw error;
        revalidatePath('/admin/dropshipping'); // Revalidate the main page as well
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
