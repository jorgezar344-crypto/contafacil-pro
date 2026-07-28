import crypto from "crypto";

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

export type SessionPayload = {
  iat: number;
  exp: number;
};

export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createSessionCookieValue(sessionSecret: string): string {
  const now = Date.now();
  const payload: SessionPayload = {
    iat: now,
    exp: now + EIGHT_HOURS_MS,
  };
  const jsonStr = JSON.stringify(payload);
  const base64Payload = Buffer.from(jsonStr, "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", sessionSecret)
    .update(base64Payload)
    .digest("hex");
  return `${base64Payload}.${signature}`;
}

export function verifySessionCookieValue(
  cookieValue: string,
  sessionSecret: string
): SessionPayload | null {
  try {
    const parts = cookieValue.split(".");
    if (parts.length !== 2) return null;
    const [base64Payload, signature] = parts;

    const expectedSignature = crypto
      .createHmac("sha256", sessionSecret)
      .update(base64Payload)
      .digest("hex");

    const bufSigActual = Buffer.from(signature, "utf-8");
    const bufSigExpected = Buffer.from(expectedSignature, "utf-8");
    if (bufSigActual.length !== bufSigExpected.length) return null;
    if (!crypto.timingSafeEqual(bufSigActual, bufSigExpected)) return null;

    const jsonStr = Buffer.from(base64Payload, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonStr) as SessionPayload;

    if (!payload.exp || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null; // Expirado

    return payload;
  } catch {
    return null;
  }
}
