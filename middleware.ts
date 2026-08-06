import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = new Set(["/login", "/recuperar-acceso", "/auth/callback"]);
const DEFAULT_URL = "https://tblfneeseopoiomqwkji.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRibGZuZWVzZW9wb2lvbXF3a2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NjQ2OTMsImV4cCI6MjEwMTM0MDY5M30.mxTF4lV2ZZj7tTtdDl3jyKWLzuqu6AC8PF5LxyTIcSo";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        } catch {}
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && !PUBLIC.has(path) && !path.startsWith("/api/") && path !== "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && path === "/login") {
    const nextPath = request.nextUrl.searchParams.get("next");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = nextPath && nextPath.startsWith("/") ? nextPath : "/inicio";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

