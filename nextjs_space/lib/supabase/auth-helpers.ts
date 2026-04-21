import { createClient } from './server';
import { prisma } from '@/lib/db';

/**
 * Get the authenticated user and their profile from the database.
 * Use in API routes and Server Components.
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error('getAuthUser: Supabase auth failed -', error?.message || 'no user');
    return null;
  }

  // Get or create profile
  let profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  if (!profile) {
    // Auto-create profile on first login
    profile = await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email || '',
        nativeLanguage: 'tr',
      },
    });
  }

  return {
    id: user.id,
    email: user.email || profile.email,
    nativeLanguage: profile.nativeLanguage,
  };
}
