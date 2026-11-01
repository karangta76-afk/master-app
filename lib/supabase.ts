import { createClient } from "@supabase/supabase-js";
const rawSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
// Supabase URL ko safely clean karo
const supabaseUrl = rawSupabaseUrl
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\/+$/, "")
  .replace(/\/rest\/v1$/, "");
if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is missing in .env.local"
  );
}
if (!supabasePublishableKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing in .env.local"
  );
}
export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);