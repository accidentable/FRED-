import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;

  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  /** Call once on app mount to restore session from localStorage */
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, isLoading: false });

    // Keep session in sync when tokens refresh or user signs out in another tab
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
    } else {
      // After sign-up, Supabase sends a confirmation email.
      // Session won't be set until email is confirmed (default behaviour).
      set({ isLoading: false, error: null });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
    } else {
      set({ isLoading: false, session: data.session, user: data.user, error: null });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    // Clear user-specific localStorage stores so the next user starts fresh
    localStorage.removeItem('fred-os-chat');
    localStorage.removeItem('fred-os-session-history');
    set({ user: null, session: null });
  },

  clearError: () => set({ error: null }),
}));
