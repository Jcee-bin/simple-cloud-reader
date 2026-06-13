import { eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { fileObjects, users } from "../db/schema.js";
import type { AccountRepository } from "./accountService.js";

export class PostgresAccountRepository implements AccountRepository {
  constructor(private readonly db: Database) {}

  async listObjectKeys(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ objectKey: fileObjects.objectKey })
      .from(fileObjects)
      .where(eq(fileObjects.userId, userId));
    return [...new Set(rows.map(({ objectKey }) => objectKey))];
  }

  async deleteUser(userId: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, userId));
  }
}
