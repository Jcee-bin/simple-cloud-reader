import { z } from "zod";

const normalizedEmailSchema = z.string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(320));

export const clientPlatformSchema = z.enum(["android", "windows"]);

export const magicLinkRequestSchema = z.object({
  email: normalizedEmailSchema,
}).strict();

export const magicLinkRedeemSchema = z.object({
  token: z.string().min(1).max(512),
  deviceId: z.uuid(),
  deviceName: z.string().trim().min(1).max(120),
  platform: clientPlatformSchema,
}).strict();

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1).max(512),
  deviceId: z.uuid(),
}).strict();

export const signOutRequestSchema = refreshRequestSchema;

export const authenticatedUserSchema = z.object({
  id: z.uuid(),
  email: normalizedEmailSchema,
}).strict();

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: z.iso.datetime(),
  refreshToken: z.string().min(1),
  user: authenticatedUserSchema,
}).strict();

export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type MagicLinkRedeem = z.infer<typeof magicLinkRedeemSchema>;
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
