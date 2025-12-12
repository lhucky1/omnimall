
'use server';

import { createClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const supabase = createClient();

const formSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2),
    role: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
    school: z.string().optional().nullable(),
});

export async function getTeamMembers() {
    try {
        const { data, error } = await supabase.from('team_members').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function addOrUpdateTeamMember(formData: FormData) {
    const supabase = createClient();
    try {
        const id = formData.get('id') as string | null;
        let imageUrl = formData.get('existingImageUrl') as string || undefined;
        const imageFile = formData.get('image') as File | null;

        if (imageFile && imageFile.size > 0) {
             const filePath = `team-images/${Date.now()}-${imageFile.name}`;
             const { error: uploadError } = await supabase.storage.from('team-images').upload(filePath, imageFile);
             if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
             const { data: urlData } = supabase.storage.from('team-images').getPublicUrl(filePath);
             imageUrl = urlData.publicUrl;
        }

        const memberData = {
            name: formData.get('name') as string,
            role: formData.get('role') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            image_url: imageUrl,
            school: (formData.get('school') as string) || null,
        };

        if (id) {
            // Update
            const { error } = await supabase.from('team_members').update(memberData).eq('id', id);
            if (error) throw error;
        } else {
            // Insert
            const { error } = await supabase.from('team_members').insert(memberData);
            if (error) throw error;
        }

        revalidatePath('/admin/staff');
        revalidatePath('/team');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteTeamMember(id: string) {
    try {
        // First, get the image URL to delete it from storage
        const { data: member, error: fetchError } = await supabase.from('team_members').select('image_url').eq('id', id).single();
        if (fetchError) console.warn(`Could not fetch member to delete image: ${fetchError.message}`);

        if (member?.image_url) {
            const fileName = member.image_url.split('/').pop();
            if (fileName) {
                // Ensure the path is correct
                const fullPath = `team-images/${fileName}`;
                const { error: storageError } = await supabase.storage.from('team-images').remove([fullPath]);
                if (storageError) console.warn(`Could not delete image from storage: ${storageError.message}`);
            }
        }

        const { error } = await supabase.from('team_members').delete().eq('id', id);
        if (error) throw error;
        
        revalidatePath('/admin/staff');
        revalidatePath('/team');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
