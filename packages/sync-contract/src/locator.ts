import { z } from "zod";

export const canonicalLocatorSchema = z.object({
  format: z.string().min(1),
  progression: z.number().min(0).max(1),
  engine: z.enum(["koreader", "readium"]),
  engineLocation: z.record(z.string(), z.unknown()),
});

export type CanonicalLocator = z.infer<typeof canonicalLocatorSchema>;
