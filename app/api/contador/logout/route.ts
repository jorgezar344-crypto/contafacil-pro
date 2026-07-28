import { NextResponse } from "next/server";
import { validateOriginHeader, SESSION_COOKIE_NAME } from "@/lib/contador-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = validateOriginHeader(request);
  if (originError) return originError;

  const isProd = process.env.NODE_ENV === "production";
  const secureFlag = isProd ? "; Secure" : "";

  const response = NextResponse.json({ success: true });
  response.headers.set("Cache-Control", "no-store");

  // Invalidar cookie contador_session con Max-Age=0
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secureFlag}`
  );

  return response;
}
