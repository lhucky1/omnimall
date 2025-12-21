
"use server";

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';

const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  businessName: z.string().min(2, "Business name is required."),
  location: z.string().min(3, "Location is required."),
  businessEmail: z.string().email("A valid email is required."),
  businessPhone: z.string().min(10, "A valid phone number is required."),
});

export async function submitVerification(formData: FormData) {
  const supabase = createClient();
  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) {
    return { success: false, error: "Administrator client not configured. Cannot process request." };
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated." };
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
    if (!selfieFile || selfieFile.size === 0) {
      return { success: false, error: 'Display photo is required.' };
    }
    
    // 1. Upload the image using the Admin client
    const filePath = `avatars/${user.id}/${Date.now()}-${selfieFile.name}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('profile-images')
      .upload(filePath, selfieFile, {
        upsert: true,
        contentType: selfieFile.type,
      });

    if (uploadError) {
      console.error('Selfie upload error:', uploadError);
      throw new Error(`Selfie upload failed: ${uploadError.message}`);
    }

    // 2. Get the public URL of the uploaded image
    const { data: urlData } = supabaseAdmin.storage.from('profile-images').getPublicUrl(filePath);
    const selfiePublicUrl = urlData.publicUrl;
    
    if (!selfiePublicUrl) {
        console.error('Could not get public URL for selfie path:', filePath);
        throw new Error('Could not get public URL for the uploaded selfie.');
    }

    // 3. Update the user's profile with the new info and set them as a verified seller
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_verified_seller: true,
        display_name: parsedData.data.fullName,
        phone_number: parsedData.data.businessPhone,
        location: parsedData.data.location,
        avatar_url: selfiePublicUrl,
      })
      .eq('uid', user.id);

    if (profileUpdateError) {
      console.error('Profile update error:', profileUpdateError);
      // Optional: attempt to delete the uploaded image if the profile update fails
      await supabaseAdmin.storage.from('profile-images').remove([filePath]);
      throw new Error(`Could not update your seller profile: ${profileUpdateError.message}`);
    }
    
    revalidatePath('/sell');
    revalidatePath('/profile');
    
    return { success: true };

  } catch (error: any) {
    console.error('Full verification submission error:', error);
    return { success: false, error: error.message || "An unexpected server error occurred. Please try again later." };
  }
}
