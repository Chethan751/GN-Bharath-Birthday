import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { AdminUser } from '../types/media';

export interface AuthSessionState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  email: string | null;
  role: AdminUser['role'] | null;
  error?: string;
}

export async function verifyAdminAccess(): Promise<AuthSessionState> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      email: null,
      role: null,
      error: 'Supabase environment variables are not configured.',
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    return { isAuthenticated: false, isAdmin: false, email: null, role: null };
  }

  const user = sessionData.session.user;

  // Verify membership in public.admin_users via security definer RPC + RLS-protected table
  const { data: isAdminRpc, error: rpcError } = await supabase.rpc('is_admin');
  if (rpcError || !isAdminRpc) {
    return {
      isAuthenticated: true,
      isAdmin: false,
      email: user.email ?? null,
      role: null,
      error: 'This account is not listed in authorized admin_users.',
    };
  }

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('role, email')
    .ilike('email', user.email ?? '')
    .maybeSingle();

  return {
    isAuthenticated: true,
    isAdmin: true,
    email: user.email ?? adminRow?.email ?? null,
    role: (adminRow?.role as AdminUser['role']) ?? 'admin',
  };
}

export async function signInAdmin(email: string, password: string): Promise<AuthSessionState> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      email: null,
      role: null,
      error: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.user) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      email: null,
      role: null,
      error: error?.message ?? 'Invalid email or password.',
    };
  }

  const status = await verifyAdminAccess();
  if (!status.isAdmin) {
    await supabase.auth.signOut();
    return {
      isAuthenticated: false,
      isAdmin: false,
      email: null,
      role: null,
      error: 'Access denied. Only the two authorized admin accounts may sign in.',
    };
  }

  return status;
}

export async function signOutAdmin(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
