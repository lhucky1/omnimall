
-- Create the team_members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    image_url TEXT
);

-- Secure the table with Row Level Security
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Allow public read access to everyone
CREATE POLICY "Allow public read access" ON team_members
FOR SELECT USING (true);

-- Allow admin users to perform all operations (insert, update, delete)
-- This assumes you have a way to identify admins, e.g., via a custom claim in JWT.
-- As a fallback, we can allow authenticated users to manage, but this is less secure.
-- For this project, we'll allow any authenticated user to manage staff.
-- In a production app, you'd restrict this to specific admin roles.
CREATE POLICY "Allow full access for authenticated users" ON team_members
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Create a storage bucket for team member images
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-images', 'team-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the team-images bucket
CREATE POLICY "Allow public read access on team images" ON storage.objects
FOR SELECT USING (bucket_id = 'team-images');

CREATE POLICY "Allow authenticated users to upload team images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'team-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update team images" ON storage.objects
FOR UPDATE WITH CHECK (bucket_id = 'team-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete team images" ON storage.objects
FOR DELETE USING (bucket_id = 'team-images' AND auth.role() = 'authenticated');

-- Insert default founder information
INSERT INTO team_members (name, role, email, phone)
VALUES ('Eric Agyapong Boateng', 'Founder & CEO', 'ericboatenglucky@gmail.com', '0597204494')
ON CONFLICT DO NOTHING;
