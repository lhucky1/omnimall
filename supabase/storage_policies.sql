
-- Policies for seller_verifications table
DROP POLICY IF EXISTS "Allow authenticated users to insert their own verification record" ON public.seller_verifications;
CREATE POLICY "Allow authenticated users to insert their own verification record"
ON public.seller_verifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policies for profiles table
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = uid)
WITH CHECK (auth.uid() = uid);

-- Policies for verification-images storage bucket
-- This policy allows authenticated users to upload to a folder named with their own user ID.
DROP POLICY IF EXISTS "Allow insert for own folder in verification-images" ON storage.objects;
CREATE POLICY "Allow insert for own folder in verification-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'verification-images' AND
    auth.uid() = (storage.foldername(name))[1]::uuid
);

-- This policy allows authenticated users to view/download files only from their own folder.
DROP POLICY IF EXISTS "Allow select for own folder in verification-images" ON storage.objects;
CREATE POLICY "Allow select for own folder in verification-images"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'verification-images' AND
    auth.uid() = (storage.foldername(name))[1]::uuid
);

-- This policy allows authenticated users to delete files only from their own folder.
DROP POLICY IF EXISTS "Allow delete for own folder in verification-images" ON storage.objects;
CREATE POLICY "Allow delete for own folder in verification-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'verification-images' AND
    auth.uid() = (storage.foldername(name))[1]::uuid
);

-- This policy allows authenticated users to update files only in their own folder.
DROP POLICY IF EXISTS "Allow update for own folder in verification-images" ON storage.objects;
CREATE POLICY "Allow update for own folder in verification-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'verification-images' AND
    auth.uid() = (storage.foldername(name))[1]::uuid
);
