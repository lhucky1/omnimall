
"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function submitVerification(formData: FormData) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not available.");
  }

  const selfieFile = formData.get("selfie") as File;
  const userId = formData.get("userId") as string;
  const fullName = formData.get("full_name") as string;
  const businessName = formData.get("business_name") as string;
  const location = formData.get("location") as string;
  const businessPhone = formData.get("business_phone") as string;
  const businessEmail = formData.get("business_email") as string;

  if (!selfieFile || !userId) {
    throw new Error("User ID and selfie are required.");
  }

  try {
    const arrayBuffer = await selfieFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExt = selfieFile.name.split(".").pop();
    const filePath = `seller_verifications/${userId}/selfie-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("seller_verification")
      .upload(filePath, buffer, {
        upsert: true,
        contentType: selfieFile.type,
      });

    if (uploadError) {
      console.error("Upload Error:", uploadError);
      throw new Error("Selfie upload failed. Please try again.");
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("seller_verification")
      .getPublicUrl(filePath);

    const { data, error: dbError } = await supabaseAdmin
      .from("seller_verifications")
      .insert({
        user_id: userId,
        selfie_url: publicUrlData.publicUrl,
        status: "pending",
        full_name: fullName,
        business_name: businessName,
        location: location,
        business_phone: businessPhone,
        business_email: businessEmail,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      throw new Error("Failed to save verification request.");
    }
    
    revalidatePath("/admin/verifications");

    return { success: true, data };
    
  } catch (error: any) {
    console.error("Verification Submission Error:", error);
    return { success: false, error: error.message };
  }
}

export async function approveVerification(verificationId: string, userId: string) {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        throw new Error("Supabase admin client not available.");
    }

    const { error: verificationError } = await supabaseAdmin
        .from('seller_verifications')
        .update({ status: 'approved' })
        .eq('id', verificationId);

    if (verificationError) {
        console.error('Error approving verification:', verificationError);
        return { success: false, error: 'Failed to approve verification.' };
    }

    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ is_verified_seller: true })
        .eq('uid', userId);
    
    if (profileError) {
        console.error('Error updating profile:', profileError);
         // Optionally rollback approval
        await supabaseAdmin.from('seller_verifications').update({ status: 'pending' }).eq('id', verificationId);
        return { success: false, error: 'Failed to update user profile to a verified seller.' };
    }

    revalidatePath("/admin/verifications");
    revalidatePath(`/profile/${userId}`);
    return { success: true };
}

export async function rejectVerification(verificationId: string) {
    const supabaseAdmin = getSupabaseAdmin();
     if (!supabaseAdmin) {
        throw new Error("Supabase admin client not available.");
    }
    
    const { error } = await supabaseAdmin
        .from('seller_verifications')
        .update({ status: 'rejected' })
        .eq('id', verificationId);

    if (error) {
        console.error('Error rejecting verification:', error);
        return { success: false, error: 'Failed to reject verification.' };
    }
    
    revalidatePath("/admin/verifications");
    return { success: true };
}
