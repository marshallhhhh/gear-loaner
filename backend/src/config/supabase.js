import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

// Admin client for server-side operations (user management, storage, etc.)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export { supabaseAdmin, supabaseUrl };
