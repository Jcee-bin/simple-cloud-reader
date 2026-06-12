import { z, type ZodType } from "zod";
import {
  authSessionSchema,
  magicLinkRedeemSchema,
  magicLinkRequestSchema,
  refreshRequestSchema,
} from "./auth.js";
import {
  fileDownloadResponseSchema,
  fileUploadCompleteSchema,
  fileUploadRequestSchema,
  fileUploadResponseSchema,
} from "./files.js";
import {
  mutationBatchSchema,
  pullResponseSchema,
  pushResponseSchema,
} from "./sync.js";

type JsonObject = Record<string, unknown>;

export interface OpenApiOperation {
  operationId: string;
  security?: Array<{ bearerAuth: never[] }>;
  parameters?: JsonObject[];
  requestBody?: {
    required: true;
    content: { "application/json": { schema: JsonObject } };
  };
  responses: Record<string, JsonObject>;
}

export interface OpenApiDocument {
  openapi: "3.1.0";
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http";
        scheme: "bearer";
        bearerFormat: "JWT";
      };
    };
    schemas: Record<string, JsonObject>;
  };
}

type JsonRequestBody = {
  required: true;
  content: { "application/json": { schema: JsonObject } };
};

function schemaFor(schema: ZodType): JsonObject {
  const { $schema: _schema, ...jsonSchema } = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    unrepresentable: "throw",
  });
  return jsonSchema;
}

function ref(name: string): JsonObject {
  return { $ref: `#/components/schemas/${name}` };
}

function jsonRequest(name: string): JsonRequestBody {
  return {
    required: true,
    content: {
      "application/json": {
        schema: ref(name),
      },
    },
  };
}

function jsonResponse(
  description: string,
  schemaName: string,
): JsonObject {
  return {
    description,
    content: {
      "application/json": {
        schema: ref(schemaName),
      },
    },
  };
}

function noContent(description: string): JsonObject {
  return { description };
}

const bearerSecurity = [{ bearerAuth: [] as never[] }];
const entityIdParameter = (name: string): JsonObject => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
});

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as JsonObject)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortDeep(item)]),
  );
}

export function generateOpenApiDocument(): OpenApiDocument {
  const document: OpenApiDocument = {
    openapi: "3.1.0",
    info: {
      title: "Simple Cloud Reader API",
      version: "1.0.0",
      description:
        "Private authentication, managed files, and offline-first reading sync.",
    },
    paths: {
      "/health": {
        get: {
          operationId: "getHealth",
          responses: {
            "200": jsonResponse("API process is responding.", "Health"),
          },
        },
      },
      "/health/live": {
        get: {
          operationId: "getLiveness",
          responses: {
            "200": jsonResponse("API process is alive.", "Liveness"),
          },
        },
      },
      "/health/ready": {
        get: {
          operationId: "getReadiness",
          responses: {
            "200": jsonResponse("Dependencies are ready.", "Readiness"),
            "503": jsonResponse(
              "One or more dependencies are unavailable.",
              "Readiness",
            ),
          },
        },
      },
      "/openapi.json": {
        get: {
          operationId: "getOpenApiDocument",
          responses: {
            "200": {
              description: "The versioned OpenAPI 3.1 document.",
              content: {
                "application/json": {
                  schema: { type: "object", additionalProperties: true },
                },
              },
            },
          },
        },
      },
      "/v1/auth/magic-link": {
        post: {
          operationId: "requestMagicLink",
          requestBody: jsonRequest("MagicLinkRequest"),
          responses: {
            "202": jsonResponse("Request accepted.", "Accepted"),
            "400": jsonResponse("Invalid request.", "Error"),
          },
        },
      },
      "/v1/auth/redeem": {
        post: {
          operationId: "redeemMagicLink",
          requestBody: jsonRequest("MagicLinkRedeem"),
          responses: {
            "200": jsonResponse("Authenticated session.", "AuthSession"),
            "400": jsonResponse("Invalid request.", "Error"),
            "401": jsonResponse("Link is invalid, expired, or used.", "Error"),
          },
        },
      },
      "/v1/auth/refresh": {
        post: {
          operationId: "refreshSession",
          requestBody: jsonRequest("RefreshRequest"),
          responses: {
            "200": jsonResponse("Rotated authenticated session.", "AuthSession"),
            "400": jsonResponse("Invalid request.", "Error"),
            "401": jsonResponse("Refresh token is invalid or reused.", "Error"),
          },
        },
      },
      "/v1/auth/sign-out": {
        post: {
          operationId: "signOut",
          requestBody: jsonRequest("RefreshRequest"),
          responses: {
            "204": noContent("Session revoked."),
            "400": jsonResponse("Invalid request.", "Error"),
          },
        },
      },
      "/v1/books/{bookId}/files": {
        post: {
          operationId: "reserveBookFileUpload",
          security: bearerSecurity,
          parameters: [entityIdParameter("bookId")],
          requestBody: jsonRequest("FileUploadRequest"),
          responses: {
            "200": jsonResponse("Upload reservation.", "FileUploadResponse"),
            "400": jsonResponse("Invalid request.", "Error"),
            "401": jsonResponse("Authentication required.", "Error"),
            "404": jsonResponse("Book not found.", "Error"),
          },
        },
      },
      "/v1/files/{fileId}/complete": {
        post: {
          operationId: "completeFileUpload",
          security: bearerSecurity,
          parameters: [entityIdParameter("fileId")],
          requestBody: jsonRequest("FileUploadComplete"),
          responses: {
            "200": jsonResponse(
              "File is ready.",
              "FileUploadCompleteResponse",
            ),
            "400": jsonResponse("Invalid upload state or byte size.", "Error"),
            "401": jsonResponse("Authentication required.", "Error"),
            "404": jsonResponse("File not found.", "Error"),
          },
        },
      },
      "/v1/files/{fileId}/download-url": {
        get: {
          operationId: "getFileDownloadUrl",
          security: bearerSecurity,
          parameters: [entityIdParameter("fileId")],
          responses: {
            "200": jsonResponse("Short-lived download URL.", "FileDownload"),
            "401": jsonResponse("Authentication required.", "Error"),
            "404": jsonResponse("File not found.", "Error"),
          },
        },
      },
      "/v1/files/{fileId}": {
        delete: {
          operationId: "deleteFile",
          security: bearerSecurity,
          parameters: [entityIdParameter("fileId")],
          responses: {
            "204": noContent("File deleted."),
            "401": jsonResponse("Authentication required.", "Error"),
            "404": jsonResponse("File not found.", "Error"),
          },
        },
      },
      "/v1/sync/push": {
        post: {
          operationId: "pushSyncChanges",
          security: bearerSecurity,
          requestBody: jsonRequest("MutationBatch"),
          responses: {
            "200": jsonResponse("Per-operation sync results.", "PushResponse"),
            "400": jsonResponse("Invalid request or cursor.", "Error"),
            "401": jsonResponse("Authentication required.", "Error"),
            "403": jsonResponse("Device mismatch.", "Error"),
          },
        },
      },
      "/v1/sync/pull": {
        get: {
          operationId: "pullSyncChanges",
          security: bearerSecurity,
          parameters: [
            {
              name: "cursor",
              in: "query",
              required: false,
              schema: { type: "string", minLength: 1 },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 500,
                default: 500,
              },
            },
          ],
          responses: {
            "200": jsonResponse("Ordered sync changes.", "PullResponse"),
            "400": jsonResponse("Invalid cursor or limit.", "Error"),
            "401": jsonResponse("Authentication required.", "Error"),
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Accepted: {
          type: "object",
          additionalProperties: false,
          required: ["accepted"],
          properties: { accepted: { type: "boolean", const: true } },
        },
        AuthSession: schemaFor(authSessionSchema),
        Error: {
          type: "object",
          additionalProperties: false,
          required: ["error"],
          properties: { error: { type: "string", minLength: 1 } },
        },
        FileDownload: schemaFor(fileDownloadResponseSchema),
        FileUploadComplete: schemaFor(fileUploadCompleteSchema),
        FileUploadCompleteResponse: {
          type: "object",
          additionalProperties: false,
          required: ["fileId", "state"],
          properties: {
            fileId: { type: "string", format: "uuid" },
            state: { type: "string", const: "ready" },
          },
        },
        FileUploadRequest: schemaFor(fileUploadRequestSchema),
        FileUploadResponse: schemaFor(fileUploadResponseSchema),
        Health: {
          type: "object",
          additionalProperties: false,
          required: ["status"],
          properties: { status: { type: "string", const: "ok" } },
        },
        Liveness: {
          type: "object",
          additionalProperties: false,
          required: ["status"],
          properties: { status: { type: "string", const: "live" } },
        },
        MagicLinkRedeem: schemaFor(magicLinkRedeemSchema),
        MagicLinkRequest: schemaFor(magicLinkRequestSchema),
        MutationBatch: schemaFor(mutationBatchSchema),
        PullResponse: schemaFor(pullResponseSchema),
        PushResponse: schemaFor(pushResponseSchema),
        Readiness: {
          type: "object",
          additionalProperties: false,
          required: ["status", "components"],
          properties: {
            status: {
              type: "string",
              enum: ["ready", "unavailable"],
            },
            components: {
              type: "object",
              additionalProperties: false,
              required: ["database", "objectStore"],
              properties: {
                database: {
                  type: "string",
                  enum: ["ready", "unavailable"],
                },
                objectStore: {
                  type: "string",
                  enum: ["ready", "unavailable"],
                },
              },
            },
          },
        },
        RefreshRequest: schemaFor(refreshRequestSchema),
      },
    },
  };

  return sortDeep(document) as OpenApiDocument;
}
