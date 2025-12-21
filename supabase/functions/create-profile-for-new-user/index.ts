
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { record: user } = await req.json();

    if (!user) {
      throw new Error("No user record in request body");
    }

    // The raw_user_meta_data contains the provider-specific data.
    const providerData = user.raw_user_meta_data;
    const isGoogleSignIn = user.app_metadata.provider === 'google';

    if (!isGoogleSignIn) {
       console.log(`User ${user.id} signed up with email, not Google. Skipping profile creation.`);
       return new Response(JSON.stringify({ message: "Not a Google sign-in, skipping." }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
       });
    }
    
    // Prepare the profile data.
    const profileData = {
      uid: user.id,
      email: user.email,
      display_name: providerData?.full_name || user.email,
      avatar_url: providerData?.avatar_url || null,
      phone_number: user.phone || null,
      location: null, // Location is not provided by Google Auth.
      is_verified_seller: false,
    };

    const { error } = await supabaseAdmin.from("profiles").insert(profileData);

    if (error) {
      console.error("Error creating profile:", error);
      throw error;
    }

    return new Response(JSON.stringify({ message: "Profile created successfully" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("An unexpected error occurred:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
