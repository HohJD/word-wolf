// Kept separate from supabase.js so checking whether online play is available
// doesn't drag the Supabase client into the main bundle.
export const isOnlineConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);
