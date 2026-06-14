export interface MaintenanceRepository {
  cleanupAuthArtifacts(input: {
    now: Date;
    usedBefore: Date;
    revokedBefore: Date;
  }): Promise<{ magicLinks: number; refreshSessions: number }>;
}

export function createMaintenanceService(input: {
  repository: MaintenanceRepository;
  now?: () => Date;
}) {
  const now = input.now ?? (() => new Date());
  return {
    async run() {
      const current = now();
      return input.repository.cleanupAuthArtifacts({
        now: current,
        usedBefore: new Date(current.getTime() - 24 * 60 * 60_000),
        revokedBefore: new Date(current.getTime() - 30 * 24 * 60 * 60_000),
      });
    },
  };
}
