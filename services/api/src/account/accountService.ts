import type { ObjectStore } from "../storage/objectStore.js";

export interface AccountRepository {
  listObjectKeys(userId: string): Promise<string[]>;
  deleteUser(userId: string): Promise<void>;
}

export function createAccountService(input: {
  repository: AccountRepository;
  objectStore: ObjectStore;
}) {
  return {
    async remove(userId: string): Promise<void> {
      const keys = await input.repository.listObjectKeys(userId);
      for (const key of keys) {
        await input.objectStore.deleteObject(key);
      }
      await input.repository.deleteUser(userId);
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
