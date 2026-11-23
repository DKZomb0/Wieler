import { createClient } from '@supabase/supabase-js';

// URL and publishable key are public by design; vercel.json maps them from the Supabase integration.
export default createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);
