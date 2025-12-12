
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendSms } from '@/services/sms';

export async function approveAndDeductStock(orderId: string, productId: string, quantity: number) {
    const supabase = createClient();
    try {
        // First, update the order status
        const { error: updateError } = await supabase
            .from('orders')
            .update({ status: 'approved' })
            .eq('id', orderId);

        if (updateError) {
            throw updateError;
        }

        // Then, call the database function to decrement stock
        const { error: rpcError } = await supabase.rpc('decrement_product_quantity', {
            p_product_id: productId,
            p_quantity_ordered: quantity,
        });

        if (rpcError) {
            // Log the error, but the order status is already updated.
            // You might want more complex logic here, like reverting the status update.
            console.error(`Failed to decrement stock for product ${productId}:`, rpcError);
            return { success: false, error: `Stock could not be updated: ${rpcError.message}` };
        }
        revalidatePath('/profile');
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function handleSmsNotification(orderId: string) {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        console.error("SMS Error: Supabase admin client not initialized.");
        return;
    }

    try {
        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select(`
                id,
                quantity,
                final_total,
                buyer_name,
                product:products(
                    name,
                    seller_uid,
                    supplier_id,
                    profiles(phone_number)
                )
            `)
            .eq('id', orderId)
            .single();

        if (error || !order || !order.product) {
            throw new Error(`Could not fetch order details for SMS: ${error?.message || 'No order data'}`);
        }

        let sellerPhoneNumber: string | null = null;
        const productDetails = order.product as any;

        // If it's a dropshipped product, get the admin's phone number instead
        if (productDetails.supplier_id) {
             const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
             if(adminEmail) {
                const { data: adminProfile, error: adminError } = await supabaseAdmin
                    .from('profiles')
                    .select('phone_number')
                    .eq('email', adminEmail)
                    .single();
                if(adminError) console.error("Could not fetch admin profile for dropship SMS", adminError);
                sellerPhoneNumber = adminProfile?.phone_number || null;
             }
        } else if (productDetails.profiles) {
            sellerPhoneNumber = productDetails.profiles.phone_number;
        }

        if (!sellerPhoneNumber) {
            console.warn(`No phone number found for seller of product in order ${orderId}. SMS not sent.`);
            return;
        }

        const messageContent = `New Omnimall Order!\nBuyer: ${order.buyer_name}\nProduct: ${productDetails.name} (x${order.quantity})\nTotal: GHC ${order.final_total}.\nclick here to open your dashboard: https://omnimall.vercel.app/profile to check your orders`;

        await sendSms({
            recipient: sellerPhoneNumber,
            message: messageContent,
        });

    } catch (error: any) {
        console.error("Failed to handle SMS notification:", error.message);
    }
}
