import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SignJWT } from "jose";

const ACCESS_TOKEN_LIFETIME_SECONDS = 15 * 60;

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateId(): string {
  return randomUUID();
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function signAccessToken(input: {
  userId: string;
  deviceId: string;
  jwtSecret: string;
  issuedAt: Date;
}): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const issuedAtSeconds = Math.floor(input.issuedAt.getTime() / 1000);
  const expiresAtSeconds = issuedAtSeconds + ACCESS_TOKEN_LIFETIME_SECONDS;
  const key = new TextEncoder().encode(input.jwtSecret);
  const token = await new SignJWT({ deviceId: input.deviceId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("simple-cloud-reader")
    .setAudience("simple-cloud-reader-clients")
    .setSubject(input.userId)
    .setIssuedAt(issuedAtSeconds)
    .setExpirationTime(expiresAtSeconds)
    .sign(key);

  return {
    token,
    expiresAt: new Date(expiresAtSeconds * 1000),
  };
}
