// ============================================================
//  SECSTRADE — SUPABASE CONFIG
//  Paste your Supabase Project URL and anon key below.
//  You can find these at: https://app.supabase.com → Settings → API
// ============================================================

const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// ============================================================

import { createClient } from "@supabase/supabase-js";

if (
  SUPABASE_URL === "https://YOUR_PROJECT_ID.supabase.co" ||
  SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY"
) {
  console.warn(
    "[SecsTrade] ⚠️  Supabase credentials not set. Edit src/lib/supabase.js"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
