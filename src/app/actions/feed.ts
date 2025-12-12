
'use server';

import { createClient as createServerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { FeedPostComment, FeedPost, UserProfile } from '@/types';

const MAX_IMAGES_PER_POST = 3;

async function uploadFeedImages(files: File[], userId: string): Promise<string[]> {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not available.");
    }
    
    const uploadPromises = files.map(async (file) => {
      const filePath = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('feed_images')
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      
      const { data: { publicUrl } } = supabaseAdmin.storage.from('feed_images').getPublicUrl(filePath);
      if (!publicUrl) throw new Error(`Failed to get public URL for ${file.name}`);
      
      return publicUrl;
    });

    return Promise.all(uploadPromises);
};

export async function createPost(formData: FormData): Promise<{ success: boolean; data?: FeedPost; error?: string }> {
    const supabase = createServerClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated.");

        const content = formData.get('content') as string;
        const imageFiles = formData.getAll('images') as File[];

        let imageUrls: string[] = [];
        if (imageFiles.length > 0 && imageFiles[0].size > 0) {
            imageUrls = await uploadFeedImages(imageFiles, user.id);
        }

        const { data: newPost, error: postError } = await supabase
            .from('feed_posts')
            .insert({ user_id: user.id, content: content || null })
            .select()
            .single();

        if (postError) throw postError;

        if (imageUrls.length > 0) {
            const imageRecords = imageUrls.map(url => ({ post_id: newPost.id, image_url: url }));
            const { error: imageError } = await supabase.from('feed_post_images').insert(imageRecords);
            if (imageError) {
                // Rollback: delete post if image insert fails
                await supabase.from('feed_posts').delete().eq('id', newPost.id);
                throw imageError;
            }
        }
        
        revalidatePath('/feed');
        revalidatePath('/my-posts');

        // Manually refetch the complete post data to return
        const { data: fullPost, error: fetchError } = await supabase
            .from('feed_posts')
            .select(`
                *,
                author:profiles!feed_posts_user_id_fkey(uid, display_name, avatar_url, is_verified_seller),
                images:feed_post_images(image_url),
                like_count:feed_post_likes(count),
                comment_count:feed_post_comments(count)
            `)
            .eq('id', newPost.id)
            .single();
        
        if (fetchError) throw fetchError;

        const transformedPost = {
            ...fullPost,
            author: fullPost.author as any,
            images: fullPost.images.map(img => img.image_url),
            like_count: fullPost.like_count[0]?.count || 0,
            comment_count: fullPost.comment_count[0]?.count || 0,
            is_liked_by_user: false,
        }

        return { success: true, data: transformedPost as FeedPost };
    } catch (error: any) {
        console.error("Create post action error:", error);
        return { success: false, error: error.message };
    }
}


export async function getFeedPosts(page = 1, pageSize = 10) {
    const supabase = createServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase
            .from('feed_posts')
            .select(`
                *,
                author:profiles!feed_posts_user_id_fkey(uid, display_name, avatar_url, is_verified_seller),
                images:feed_post_images(image_url),
                like_count:feed_post_likes(count),
                comment_count:feed_post_comments(count),
                is_liked_by_user:feed_post_likes!left(user_id)
            `, { count: 'exact' })
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);
        
        if (user) {
            query = query.eq('is_liked_by_user.user_id', user.id);
        }

        const { data, error, count } = await query;
        
        if (error) throw error;
        
        const transformedData = data.map(post => ({
            ...post,
            author: post.author as any,
            images: post.images.map(img => img.image_url),
            like_count: post.like_count[0]?.count || 0,
            comment_count: post.comment_count[0]?.count || 0,
            is_liked_by_user: user ? (post.is_liked_by_user?.length > 0) : false,
        }));

        return { success: true, data: transformedData as FeedPost[], count };
    } catch(error: any) {
        console.error("Get feed posts error:", error)
        return { success: false, error: error.message };
    }
}

export async function getMyPosts() {
    const supabase = createServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated.");

        const { data, error } = await supabase
            .from('feed_posts')
            .select(`
                *,
                images:feed_post_images(image_url),
                author:profiles!feed_posts_user_id_fkey(uid, display_name, avatar_url, is_verified_seller),
                like_count:feed_post_likes(count),
                comment_count:feed_post_comments(count)
            `)
            .eq('user_id', user.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const transformedData = data.map(post => ({
            ...post,
            author: post.author as any,
            images: post.images.map(img => img.image_url),
            like_count: post.like_count[0]?.count || 0,
            comment_count: post.comment_count[0]?.count || 0,
            is_liked_by_user: false, // This info isn't needed for 'my posts' view but keeps type consistent
        }));

        return { success: true, data: transformedData as FeedPost[] };

    } catch (error: any) {
        console.error("Error fetching user's posts:", error);
        return { success: false, error: error.message };
    }
}


export async function deletePost(postId: string) {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return { success: false, error: "Supabase admin client not initialized." };
    }

    try {
        // Soft-delete the post
        const { error: deleteError } = await supabaseAdmin
            .from('feed_posts')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('id', postId);

        if (deleteError) throw deleteError;
        
        revalidatePath('/feed');
        revalidatePath('/my-posts');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting post:", error)
        return { success: false, error: error.message };
    }
}


export async function togglePostLike(postId: string) {
    const supabase = createServerClient();
     try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated.");

        const { data: existingLike, error: fetchError } = await supabase
            .from('feed_post_likes')
            .select('*')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        if (existingLike) {
            // Unlike
            const { error: deleteError } = await supabase
                .from('feed_post_likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', user.id);
            if (deleteError) throw deleteError;
        } else {
            // Like
            const { error: insertError } = await supabase
                .from('feed_post_likes')
                .insert({ post_id: postId, user_id: user.id });
            if (insertError) throw insertError;
        }
        
        revalidatePath('/feed');
        return { success: true };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPostComments(postId: string) {
    const supabase = createServerClient();
    try {
        const { data, error } = await supabase
            .from('feed_post_comments')
            .select('*, author:profiles!feed_post_comments_user_id_fkey(uid, display_name, avatar_url, is_verified_seller)')
            .eq('post_id', postId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data: data as FeedPostComment[] };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
}

export async function addComment(postId: string, content: string): Promise<{ success: boolean; data?: FeedPostComment; error?: string; }> {
    const supabase = createServerClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data: newComment, error } = await supabase
            .from('feed_post_comments')
            .insert({ post_id: postId, user_id: user.id, content: content })
            .select()
            .single();

        if (error) throw error;

        // Fetch the comment again with author info
        const { data: commentWithAuthor, error: fetchError } = await supabase
            .from('feed_post_comments')
            .select('*, author:profiles!feed_post_comments_user_id_fkey(uid, display_name, avatar_url, is_verified_seller)')
            .eq('id', newComment.id)
            .single();

        if(fetchError) throw fetchError;

        revalidatePath('/feed');
        return { success: true, data: commentWithAuthor as FeedPostComment };

    } catch(error: any) {
        console.error("Error in addComment server action: ", error);
        return { success: false, error: error.message };
    }
}


export async function deletePostAsAdmin(postId: string) {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return { success: false, error: "Supabase admin client not initialized." };
    }

    try {
        // 1. Get image URLs to delete from storage
        const { data: images, error: imagesError } = await supabaseAdmin
            .from('feed_post_images')
            .select('image_url')
            .eq('post_id', postId);
        
        if (imagesError) console.warn(`Could not fetch images for post ${postId}: ${imagesError.message}`);

        // 2. Hard-delete the post from the database. CASCADE should handle the rest.
        const { error: deleteError } = await supabaseAdmin
            .from('feed_posts')
            .delete()
            .eq('id', postId);

        if (deleteError) throw deleteError;

        // 3. Delete images from storage after successful db deletion
        if (images && images.length > 0) {
            const imageUrls = images.map(img => img.image_url);
            const filePaths = imageUrls.map(url => new URL(url).pathname.split('/public/feed_images/')[1]).filter(Boolean);
            if (filePaths.length > 0) {
                const { error: storageError } = await supabaseAdmin.storage.from('feed_images').remove(filePaths);
                if (storageError) {
                    // Log this error but don't fail the whole operation since the DB part succeeded.
                    console.warn(`Could not delete images from storage for post ${postId}: ${storageError.message}`);
                }
            }
        }
        
        revalidatePath('/feed');
        revalidatePath('/admin/feed');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting post as admin:", error)
        return { success: false, error: error.message };
    }
}
