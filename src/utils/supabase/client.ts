import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ Warning: Supabase URL or Key is missing. Using placeholder client for build/prerendering.");
    return createBrowserClient(
      supabaseUrl || "https://placeholder-url.supabase.co",
      supabaseKey || "placeholder-key"
    );
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
};
