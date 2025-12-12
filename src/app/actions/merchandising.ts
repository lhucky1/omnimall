
'use server';

import { createClient } from '@/lib/supabase';
import type { Product, UserProfile } from '@/types';
import { revalidatePath } from 'next/cache';

const supabase = createClient();

export type MerchandisedContent = {
  [key: string]: (Product | UserProfile)[];
};

export async function getMerchandisedItems(): Promise<{ data?: MerchandisedContent; error?: string }> {
  try {
    const { data: merchandising, error } = await supabase
      .from('merchandising')
      .select('section_id, item_id, item_type, position')
      .order('position', { ascending: true });

    if (error) {
        if (error.code === '42P01') {
            console.warn("Merchandising table not found. Returning empty content.");
            return { data: {} };
        }
        throw error;
    }
    if (!merchandising) return { data: {} };

    const productIds = merchandising.filter(m => m.item_type === 'product').map(m => m.item_id);
    const sellerIds = merchandising.filter(m => m.item_type === 'seller').map(m => m.item_id);

    const productsPromise = productIds.length > 0 ? supabase.from('products').select('*, profiles(*)').in('id', productIds).eq('status', 'approved') : Promise.resolve({ data: [], error: null });
    const sellersPromise = sellerIds.length > 0 ? supabase.from('profiles').select('*').in('uid', sellerIds).eq('is_verified_seller', true) : Promise.resolve({ data: [], error: null });

    const [{ data: products, error: productError }, { data: sellers, error: sellerError }] = await Promise.all([productsPromise, sellersPromise]);
   
    if (productError) throw productError;
    if (sellerError) throw sellerError;

    const content: MerchandisedContent = {};

    for (const item of merchandising) {
      if (!content[item.section_id]) {
        content[item.section_id] = [];
      }
      if (item.item_type === 'product') {
        const product = products?.find(p => p.id === item.item_id);
        if (product) content[item.section_id].push(product as Product);
      } else if (item.item_type === 'seller') {
        const seller = sellers?.find(s => s.uid === item.item_id);
        if (seller) content[item.section_id].push(seller as UserProfile);
      }
    }

    return { data: content };
  } catch (err: any) {
    console.error("Error in getMerchandisedItems:", err);
    return { error: err.message };
  }
}

export async function saveAllMerchandisedItems(
    sections: { sectionId: string; items: { id: string; type: 'product' | 'seller' }[] }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Start by deleting all existing merchandising records
    const { error: deleteError } = await supabase.from('merchandising').delete().filter('id', 'not.is', null);
    if (deleteError) throw deleteError;

    const allNewRecords: any[] = [];
    sections.forEach(section => {
        section.items.forEach((item, index) => {
            allNewRecords.push({
                section_id: section.sectionId,
                item_id: item.id,
                item_type: item.type,
                position: index,
            });
        });
    });

    if (allNewRecords.length > 0) {
        const { error: insertError } = await supabase
            .from('merchandising')
            .insert(allNewRecords);

        if (insertError) throw insertError;
    }

    revalidatePath('/');
    revalidatePath('/admin/merchandising');

    return { success: true };
  } catch (err: any) {
    console.error(`Error saving all merchandising sections:`, err);
    return { success: false, error: err.message };
  }
}

    