import { errors, jwtVerify, SignJWT } from "jose";
import { SyncError } from "./syncStore.js";

const CURSOR_ISSUER = "simple-cloud-reader-sync";
const CURSOR_AUDIENCE = "simple-cloud-reader-clients";

export function createCursorCodec(secret: string) {
  if (new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("Cursor secret must be at least 32 bytes");
  }
  const key = new TextEncoder().encode(secret);

  return {
    async encode(userId: string, sequence: number): Promise<string> {
      return new SignJWT({ sequence })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(CURSOR_ISSUER)
        .setAudience(CURSOR_AUDIENCE)
        .setSubject(userId)
        .sign(key);
    },

    async decode(userId: string, cursor?: string): Promise<number> {
      if (!cursor) return 0;
      try {
        const { payload } = await jwtVerify(cursor, key, {
          issuer: CURSOR_ISSUER,
          audience: CURSOR_AUDIENCE,
          subject: userId,
        });
        if (
          typeof payload.sequence !== "number"
          || !Number.isSafeInteger(payload.sequence)
          || payload.sequence < 0
        ) {
          throw new SyncError(400, "invalid_cursor");
        }
        return payload.sequence;
      } catch (error) {
        if (error instanceof SyncError) throw error;
        if (error instanceof errors.JOSEError) {
          throw new SyncError(400, "invalid_cursor");
        }
        throw error;
      }
    },
  };
}
