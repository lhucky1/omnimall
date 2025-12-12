import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// This is a helper function to get the user session on the server.
// It's useful for server actions and API routes.
export const getServerSession = async () => {
    const cookieStore = cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
            get(name: string) {
                return cookieStore.get(name)?.value
            },
            },
        }
    )

    const { data: { session } } = await supabase.auth.getSession()

    return {
        session,
        userId: session?.user?.id,
    }
}
