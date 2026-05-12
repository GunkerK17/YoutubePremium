import { supabase } from "../lib/supabase";

export const authService = {
  signInWithEmail: (email, password) =>
    supabase.auth.signInWithPassword({ email, password }),

  signInWithGoogle: () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  getUser: () => supabase.auth.getUser(),

  updatePassword: (newPassword) =>
    supabase.auth.updateUser({ password: newPassword }),

  resetPassword: (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    }),
};