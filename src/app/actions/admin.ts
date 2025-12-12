'use server';

import { createClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

const supabase = createClient();

export async function approveSellerVerification(userId: string, verificationId: string) {
  try {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_verified_seller: true })
      .eq('uid', userId);

    if (profileError) throw profileError;

    const { error: verificationError } = await supabase
      .from('seller_verifications')
      .update({ status: 'approved' })
      .eq('id', verificationId);
      
    if (verificationError) throw verificationError;

    revalidatePath('/admin/sellers');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function rejectSellerVerification(verificationId: string) {
    try {
        const { error } = await supabase
            .from('seller_verifications')
            .update({ status: 'rejected' })
            .eq('id', verificationId);
        
        if (error) throw error;
        
        revalidatePath('/admin/sellers');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function revokeSellerPrivileges(userId: string) {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ is_verified_seller: false })
            .eq('uid', userId);

        if (error) throw error;

        revalidatePath('/admin/sellers');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
