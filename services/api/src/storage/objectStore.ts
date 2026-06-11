import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface ObjectStore {
  createUploadUrl(
    key: string,
    contentType: string,
  ): Promise<{ key: string; contentType: string; url: string }>;
  createDownloadUrl(key: string): Promise<{ key: string; url: string }>;
}

export interface ObjectStoreConfig {
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_BUCKET: string;
  S3_FORCE_PATH_STYLE: boolean;
}

export function createObjectStore(config: ObjectStoreConfig): ObjectStore {
  const client = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    },
  });

  return {
    async createUploadUrl(key, contentType) {
      const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
        ContentType: contentType,
      });
      return {
        key,
        contentType,
        url: await getSignedUrl(client, command, { expiresIn: 900 }),
      };
    },
    async createDownloadUrl(key) {
      const command = new GetObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      });
      return {
        key,
        url: await getSignedUrl(client, command, { expiresIn: 900 }),
      };
    },
  };
}
