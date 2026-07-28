import { NextResponse } from "next/server";
import { timingSafeCompare, createSessionCookieValue } from "@/lib/session-crypto";
import { validateOriginHeader, SESSION_COOKIE_NAME, EIGHT_HOURS_SECONDS } from "@/lib/contador-auth";

export const runtime = "nodejs";

const MAX_KEY_LENGTH = 256;

export async function POST(request: Request) {
  const originError = validateOriginHeader(request);
  if (originError) return originError;

  const loginSecret = process.env.CONTADOR_LOGIN_SECRET;
  const sessionSecret = process.env.CONTADOR_SESSION_SECRET;

  if (!loginSecret || !sessionSecret) {
    const errorRes = NextResponse.json(
      {
        success: false,
        code: "AUTH_CONFIG_ERROR",
        error: "La configuración de autenticación no está completa en el servidor.",
      },
      { status: 500 }
    );
    errorRes.headers.set("Cache-Control", "no-store");
    return errorRes;
  }

  let body: { accessKey?: unknown };
  try {
    body = await request.json();
  } catch {
    const errorRes = NextResponse.json(
      { success: false, code: "INVALID_BODY", error: "El cuerpo de la solicitud no es válido." },
      { status: 400 }
    );
    errorRes.headers.set("Cache-Control", "no-store");
    return errorRes;
  }

  const accessKey = body?.accessKey;
  if (typeof accessKey !== "string" || !accessKey.trim() || accessKey.length > MAX_KEY_LENGTH) {
    const errorRes = NextResponse.json(
      { success: false, code: "UNAUTHORIZED", error: "Clave de acceso no válida." },
      { status: 401 }
    );
    errorRes.headers.set("Cache-Control", "no-store");
    return errorRes;
  }

  const isValid = timingSafeCompare(accessKey.trim(), loginSecret);
  if (!isValid) {
    const errorRes = NextResponse.json(
      { success: false, code: "UNAUTHORIZED", error: "Clave de acceso incorrecta." },
      { status: 401 }
    );
    errorRes.headers.set("Cache-Control", "no-store");
    return errorRes;
  }

  // Generar valor firmado de sesión
  const cookieValue = createSessionCookieValue(sessionSecret);
  const isProd = process.env.NODE_ENV === "production";
  const secureFlag = isProd ? "; Secure" : "";

  const response = NextResponse.json({ success: true });
  response.headers.set("Cache-Control", "no-store");

  // Emitir Cookie HttpOnly contador_session (Max-Age=28800 s / 8h)
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${cookieValue}; Path=/; Max-Age=${EIGHT_HOURS_SECONDS}; HttpOnly; SameSite=Strict${secureFlag}`
  );

  return response;
}
