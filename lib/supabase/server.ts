import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const DEFAULT_URL = "https://tblfneeseopoiomqwkji.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRibGZuZWVzZW9wb2lvbXF3a2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NjQ2OTMsImV4cCI6MjEwMTM0MDY5M30.mxTF4lV2ZZj7tTtdDl3jyKWLzuqu6AC8PF5LxyTIcSo";

export async function createSupabaseServerClient() {
  const store = await cookies();
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

