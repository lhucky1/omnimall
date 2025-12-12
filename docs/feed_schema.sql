
-- ============================================================================
-- 1. TABLE CREATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feed_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.feed_post_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.feed_post_likes (
    post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.feed_post_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================================================
-- 2. BUCKET CREATION & POLICIES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('feed_images', 'feed_images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for feed_images bucket
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'feed_images');

DROP POLICY IF EXISTS "Allow sellers to upload to their folder" ON storage.objects;
CREATE POLICY "Allow sellers to upload to their folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'feed_images'
    AND auth.uid() = (storage.foldername(name))[1]::uuid
    AND (SELECT is_verified_seller FROM public.profiles WHERE id = auth.uid()) = true
);

DROP POLICY IF EXISTS "Allow post owners to delete their images" ON storage.objects;
CREATE POLICY "Allow post owners to delete their images" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'feed_images'
    AND auth.uid() = (storage.foldername(name))[1]::uuid
);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- feed_posts table
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.feed_posts;
CREATE POLICY "Allow public read access" ON public.feed_posts
FOR SELECT TO public USING (is_deleted = false);

DROP POLICY IF EXISTS "Allow sellers to insert their own posts" ON public.feed_posts;
CREATE POLICY "Allow sellers to insert their own posts" ON public.feed_posts
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT is_verified_seller FROM public.profiles WHERE uid = auth.uid()) = true
    AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "Allow owner to soft-delete their own posts" ON public.feed_posts;
CREATE POLICY "Allow owner to soft-delete their own posts" ON public.feed_posts
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (is_deleted = true AND deleted_at IS NOT NULL);


-- feed_post_images table
ALTER TABLE public.feed_post_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.feed_post_images;
CREATE POLICY "Allow public read access" ON public.feed_post_images
FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow owner to insert" ON public.feed_post_images;
CREATE POLICY "Allow owner to insert" ON public.feed_post_images
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = (SELECT user_id FROM feed_posts WHERE id = post_id));

-- feed_post_likes table
ALTER TABLE public.feed_post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.feed_post_likes;
CREATE POLICY "Allow public read access" ON public.feed_post_likes
FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.feed_post_likes;
CREATE POLICY "Allow authenticated users to insert" ON public.feed_post_likes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow owner to delete their like" ON public.feed_post_likes;
CREATE POLICY "Allow owner to delete their like" ON public.feed_post_likes
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- feed_post_comments table
ALTER TABLE public.feed_post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.feed_post_comments;
CREATE POLICY "Allow public read access" ON public.feed_post_comments
FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.feed_post_comments;
CREATE POLICY "Allow authenticated users to insert" ON public.feed_post_comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow owner to delete their comment" ON public.feed_post_comments;
CREATE POLICY "Allow owner to delete their comment" ON public.feed_post_comments
FOR DELETE TO authenticated
USING (auth.uid() = user_id);


-- ============================================================================
-- 4. VIEWS AND FUNCTIONS
-- ============================================================================

CREATE OR REPLACE VIEW public.feed_posts_with_details AS
SELECT
    p.id,
    p.user_id,
    p.content,
    p.created_at,
    p.is_deleted,
    p.deleted_at,
    json_build_object(
        'uid', u.uid,
        'display_name', u.display_name,
        'avatar_url', u.avatar_url,
        'is_verified_seller', u.is_verified_seller
    ) AS author,
    (
        SELECT coalesce(json_agg(pi.image_url ORDER BY pi.created_at), '[]'::json)
        FROM feed_post_images pi
        WHERE pi.post_id = p.id
    ) AS images,
    (
        SELECT count(*)::int
        FROM feed_post_likes pl
        WHERE pl.post_id = p.id
    ) AS like_count,
    (
        SELECT count(*)::int
        FROM feed_post_comments pc
        WHERE pc.post_id = p.id
    ) AS comment_count,
    (
        SELECT exists(
            SELECT 1
            FROM feed_post_likes pl
            WHERE pl.post_id = p.id AND pl.user_id = auth.uid()
        )
    ) AS is_liked_by_user
FROM
    feed_posts p
JOIN
    profiles u ON p.user_id = u.uid
WHERE
    p.is_deleted = false;

-- Function to get paginated feed
CREATE OR REPLACE FUNCTION public.get_feed(page_number integer, page_size integer)
RETURNS SETOF feed_posts_with_details
LANGUAGE sql
AS $$
    SELECT *
    FROM public.feed_posts_with_details
    ORDER BY created_at DESC
    LIMIT page_size
    OFFSET (page_number - 1) * page_size;
$$;


-- Function to toggle a like
CREATE OR REPLACE FUNCTION public.toggle_like(post_id_to_toggle uuid)
RETURNS TABLE(new_like_count integer)
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_id uuid := auth.uid();
BEGIN
    IF EXISTS (SELECT 1 FROM public.feed_post_likes WHERE post_id = post_id_to_toggle AND user_id = current_user_id) THEN
        DELETE FROM public.feed_post_likes WHERE post_id = post_id_to_toggle AND user_id = current_user_id;
    ELSE
        INSERT INTO public.feed_post_likes (post_id, user_id) VALUES (post_id_to_toggle, current_user_id);
    END IF;

    RETURN QUERY
    SELECT count(*)::int FROM public.feed_post_likes WHERE post_id = post_id_to_toggle;
END;
$$;

