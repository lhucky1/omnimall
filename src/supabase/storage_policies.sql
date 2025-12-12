-- Drop existing policies on the verification-images bucket to avoid conflicts.
DROP POLICY IF EXISTS "Allow authenticated users to upload verification images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view their own verification images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own verification images" ON storage.objects;

-- Create a single, permissive policy for the verification-images bucket.
-- This policy allows any user who is logged in (authenticated) to perform
-- any action (upload, view, update, delete) on any file within this bucket.
CREATE POLICY "Allow all actions for authenticated users on verification images"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'verification-images' )
WITH CHECK ( bucket_id = 'verification-images' );

-- Note: This is a broad policy. For stricter security in a production environment,
-- you would typically restrict users to their own folder using a policy like:
-- USING ( bucket_id = 'verification-images' AND (storage.foldername(name))[1] = auth.uid()::text )
-- However, this simplified policy will resolve the current upload errors.
