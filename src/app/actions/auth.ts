
'use server';

import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const emailSchema = z.string().email({ message: 'Please enter a valid email address.' });
const passwordSchema = z.string().min(8, { message: 'Password must be at least 8 characters.' });

export async function requestPasswordReset(email: string) {
    const supabase = createClient();
    try {
        const parsedEmail = emailSchema.safeParse(email);
        if (!parsedEmail.success) {
            return { success: false, error: parsedEmail.error.flatten().formErrors[0] };
        }

        const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
        });

        if (error) throw error;
        
        return { success: true };
    } catch (error: any) {
        console.error('Password reset request error:', error);
        return { success: false, error: error.message || 'Could not send password reset email.' };
    }
}

export async function resetPassword(password: string) {
    const supabase = createClient();

    try {
        const parsedPassword = passwordSchema.safeParse(password);
        if (!parsedPassword.success) {
            return { success: false, error: parsedPassword.error.flatten().formErrors[0] };
        }
        
        const { error } = await supabase.auth.updateUser({ password: parsedPassword.data });

        if (error) throw error;

        return { success: true };
    } catch (error: any) {
        console.error('Reset password error:', error);
        return { success: false, error: error.message || "Could not update password." };
    }
}
