-- Drop existing policies if they exist, to prevent errors on re-run
DROP POLICY IF EXISTS "Allow users to insert their own verification" ON public.seller_verifications;
DROP POLICY IF EXISTS "Allow users to view their own verification status" ON public.seller_verifications;
DROP POLICY IF EXISTS "Allow admins to view all verification requests" ON public.seller_verifications;
DROP POLICY IF EXISTS "Allow admins to update verification statuses" ON public.seller_verifications;

-- Create the seller_verifications table to store verification requests
-- This runs only if the table does not already exist
CREATE TABLE IF NOT EXISTS seller_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ghana_card_url TEXT NOT NULL,
    selfie_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add is_verified_seller and is_admin columns to the profiles table if they don't exist
-- This helps prevent errors if you run the script multiple times.
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_verified_seller') THEN
    ALTER TABLE profiles ADD COLUMN is_verified_seller BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_admin') THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;


-- Enable Row Level Security (RLS) on the new table
ALTER TABLE seller_verifications ENABLE ROW LEVEL SECURITY;

-- Policies for seller_verifications table
-- Allow users to insert their own verification request
CREATE POLICY "Allow users to insert their own verification"
ON seller_verifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own verification status
CREATE POLICY "Allow users to view their own verification status"
ON seller_verifications FOR SELECT
USING (auth.uid() = user_id);

-- FIXED: Allow admins to view all verification requests
CREATE POLICY "Allow admins to view all verification requests"
ON seller_verifications FOR SELECT
USING (
  (SELECT is_admin FROM profiles WHERE uid = (auth.uid())::text) = true
);

-- FIXED: Allow admins to update verification statuses
CREATE POLICY "Allow admins to update verification statuses"
ON seller_verifications FOR UPDATE
USING (
  (SELECT is_admin FROM profiles WHERE uid = (auth.uid())::text)
);


-- Setup trigger to update 'updated_at' timestamp
-- This makes sure the updated_at column is automatically changed on any row update.
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_seller_verifications_updated ON seller_verifications;
CREATE TRIGGER on_seller_verifications_updated
  BEFORE UPDATE ON seller_verifications
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();