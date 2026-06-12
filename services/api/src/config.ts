import { z } from "zod";

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1).default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.stringbool().default(false),
});

export type ApiConfig = z.infer<typeof configSchema>;

export function loadConfig(
  environment: NodeJS.ProcessEnv | Record<string, string | undefined> =
    process.env,
): ApiConfig {
  return configSchema.parse(environment);
}
