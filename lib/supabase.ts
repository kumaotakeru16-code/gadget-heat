import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
  );
}

// Service-role client — server-only, never import from client components.
export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
