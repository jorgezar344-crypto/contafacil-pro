"use client";
import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_URL = "https://tblfneeseopoiomqwkji.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRibGZuZWVzZW9wb2lvbXF3a2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NjQ2OTMsImV4cCI6MjEwMTM0MDY5M30.mxTF4lV2ZZj7tTtdDl3jyKWLzuqu6AC8PF5LxyTIcSo";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
  return createBrowserClient(url, key);
}

