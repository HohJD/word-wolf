import { createClient } from '@supabase/supabase-js';
import { isOnlineConfigured } from './onlineConfig';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Online play is optional — the site still works as pass-and-play without
// credentials, so a missing config disables online mode rather than throwing.
export const supabase = isOnlineConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export { isOnlineConfigured };
