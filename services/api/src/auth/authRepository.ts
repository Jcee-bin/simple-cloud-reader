export interface StoredMagicLink {
  id: string;
  normalizedEmail: string;
  tokenHash: string;
  requestedIpHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export type ConsumeMagicLinkResult =
  | { status: "valid"; normalizedEmail: string }
  | { status: "invalid" | "used" | "expired" };

export interface UserRecord {
  id: string;
  email: string;
}

export interface RefreshSessionRecord {
  id: string;
  userId: string;
  deviceId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
}

export type RefreshRotationResult =
  | { status: "rotated"; user: UserRecord }
  | { status: "invalid" | "reused" };

export interface AuthRepository {
  storeMagicLink(record: StoredMagicLink): Promise<void>;
  countRecentMagicLinkRequests(input: {
    normalizedEmail: string;
    requestedIpHash: string;
    since: Date;
  }): Promise<{ emailCount: number; ipCount: number }>;
  consumeMagicLink(
    tokenHash: string,
    consumedAt: Date,
  ): Promise<ConsumeMagicLinkResult>;
  findOrCreateUser(normalizedEmail: string): Promise<UserRecord>;
  upsertDevice(input: {
    id: string;
    userId: string;
    name: string;
    platform: "android" | "windows";
    seenAt: Date;
  }): Promise<void>;
  createRefreshSession(record: RefreshSessionRecord): Promise<void>;
  rotateRefreshSession(input: {
    tokenHash: string;
    deviceId: string;
    replacement: Pick<
      RefreshSessionRecord,
      "id" | "tokenHash" | "expiresAt"
    >;
    rotatedAt: Date;
  }): Promise<RefreshRotationResult>;
  revokeRefreshSession(tokenHash: string, revokedAt: Date): Promise<void>;
}
