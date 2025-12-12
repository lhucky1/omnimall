
"use server";

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';

const formSchema = z.object({
  fullName: z.string().min(2),
  businessName: z.string().min(2),
  location: z.string().min(3),
  businessEmail: z.string().email(),
  businessPhone: z.string().min(10),
});

export async function submitVerification(formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated." };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { success: false, error: "Administrator client not configured. Cannot process request." };
  }

  try {
    const rawData = {
      fullName: formData.get('fullName'),
      businessName: formData.get('businessName'),
      location: formData.get('location'),
      businessEmail: formData.get('businessEmail'),
      businessPhone: formData.get('businessPhone'),
    };
    
    const parsedData = formSchema.safeParse(rawData);
    if (!parsedData.success) {
      return { success: false, error: 'Invalid form data.', details: parsedData.error.flatten() };
    }

    const selfieFile = formData.get('selfie') as File;
    if (!selfieFile) {
      return { success: false, error: 'Display photo is required.' };
    }
    
    const selfiePath = `${user.id}/selfie-${Date.now()}`;
    const { error: selfieUploadError } = await supabaseAdmin.storage
      .from('verification-images')
      .upload(selfiePath, selfieFile);

    if (selfieUploadError) {
      console.error('Selfie upload error:', selfieUploadError);
      throw new Error(`Selfie upload failed: ${selfieUploadError.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage.from('verification-images').getPublicUrl(selfiePath);
    const selfiePublicUrl = urlData.publicUrl;
    
    if (!selfiePublicUrl) {
        console.error('Could not get public URL for selfie path:', selfiePath);
        throw new Error('Could not get public URL for the uploaded selfie.');
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('seller_verifications')
      .insert({
        user_id: user.id, // Use the authenticated user's ID
        selfie_url: selfiePublicUrl,
        status: 'approved', // Auto-approve
        full_name: parsedData.data.fullName,
        business_name: parsedData.data.businessName,
        location: parsedData.data.location,
        business_email: parsedData.data.businessEmail,
        business_phone: parsedData.data.businessPhone,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Verification insert error:', insertError);
      throw new Error(`Could not save verification record: ${insertError.message}`);
    }

    // Now just update the profile status and other details
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
          is_verified_seller: true, 
          avatar_url: selfiePublicUrl, // Update avatar with selfie
          display_name: parsedData.data.businessName, // Update name to business name
          location: parsedData.data.location, 
          phone_number: parsedData.data.businessPhone 
      })
      .eq('uid', user.id);
    
    if (profileUpdateError) {
      console.error('Profile update error:', profileUpdateError);
      // Rollback image upload if profile update fails
      await supabaseAdmin.storage.from('verification-images').remove([selfiePath]);
      throw new Error(`Could not update user profile status: ${profileUpdateError.message}`);
    }

    revalidatePath('/sell');
    revalidatePath('/profile');
    
    return { success: true, data: data };

  } catch (error: any) {
    console.error('Full verification submission error:', error);
    return { success: false, error: error.message || "An unexpected server error occurred. Please try again later." };
  }
}
