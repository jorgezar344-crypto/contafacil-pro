import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const DEFAULT_URL = "https://tblfneeseopoiomqwkji.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRibGZuZWVzZW9wb2lvbXF3a2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NjQ2OTMsImV4cCI6MjEwMTM0MDY5M30.mxTF4lV2ZZj7tTtdDl3jyKWLzuqu6AC8PF5LxyTIcSo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, next } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Ingresa tu correo y contraseña." },
        { status: 400 }
      );
    }

    const redirectTarget = next && typeof next === "string" && next.startsWith("/") ? next : "/inicio";
    const response = NextResponse.json({ success: true, redirect: redirectTarget });

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => {
          const cookieHeader = request.headers.get("cookie") || "";
          return cookieHeader.split(";").map((c) => {
            const [name, ...rest] = c.trim().split("=");
            return { name, value: rest.join("=") };
          }).filter((c) => c.name);
        },
        setAll: (items) => {
          items.forEach(({ name, value, options }) => {
            try {
              response.cookies.set(name, value, options);
            } catch {}
          });
        },
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const msg = error.message?.toLowerCase().includes("invalid login credentials")
        ? "Correo o contraseña incorrectos. Verifica tus datos de acceso."
        : error.message || "No fue posible iniciar sesión con el servidor de autenticación.";
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Error interno al procesar el inicio de sesión." },
      { status: 500 }
    );
  }
}
