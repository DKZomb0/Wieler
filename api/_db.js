const { createClient } = require("@supabase/supabase-js");

// Queries run as the logged-in user, so row-level security decides what they can read or write.
module.exports = (token) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
