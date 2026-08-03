import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
const PUBLIC = new Set(["/login", "/recuperar-acceso", "/auth/callback"]);
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({name,value,options}) => response.cookies.set(name,value,options)); } } });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && !PUBLIC.has(path) && !path.startsWith("/api/") && path !== "/") { const url = request.nextUrl.clone(); url.pathname = "/login"; url.searchParams.set("next", path); return NextResponse.redirect(url); }
  if (user && path === "/login") { const url = request.nextUrl.clone(); url.pathname = "/inicio"; return NextResponse.redirect(url); }
  response.headers.set("Cache-Control", "private, no-store"); return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
