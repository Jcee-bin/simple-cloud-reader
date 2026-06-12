import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", {
  mode: "date",
  withTimezone: true,
}).notNull().defaultNow();

const updatedAt = timestamp("updated_at", {
  mode: "date",
  withTimezone: true,
}).notNull().defaultNow();

const deletedAt = timestamp("deleted_at", {
  mode: "date",
  withTimezone: true,
});

const version = integer("version").notNull().default(1);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  normalizedEmail: text("normalized_email").notNull(),
  createdAt,
  updatedAt,
  deletedAt,
}, (table) => [
  unique("users_normalized_email_unique").on(table.normalizedEmail),
]);

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  createdAt,
  lastSeenAt: timestamp("last_seen_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
}, (table) => [
  index("devices_user_id_index").on(table.userId),
]);

export const magicLinks = pgTable("magic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  normalizedEmail: text("normalized_email").notNull(),
  tokenHash: text("token_hash").notNull(),
  requestedIpHash: text("requested_ip_hash"),
  expiresAt: timestamp("expires_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  usedAt: timestamp("used_at", { mode: "date", withTimezone: true }),
  createdAt,
}, (table) => [
  unique("magic_links_token_hash_unique").on(table.tokenHash),
  index("magic_links_email_created_index").on(
    table.normalizedEmail,
    table.createdAt,
  ),
]);

export const refreshSessions = pgTable("refresh_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  deviceId: uuid("device_id").notNull().references(() => devices.id, {
    onDelete: "cascade",
  }),
  familyId: uuid("family_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  revokedAt: timestamp("revoked_at", { mode: "date", withTimezone: true }),
  replacedById: uuid("replaced_by_id"),
  createdAt,
}, (table) => [
  unique("refresh_sessions_user_token_unique").on(
    table.userId,
    table.tokenHash,
  ),
  index("refresh_sessions_family_index").on(table.userId, table.familyId),
]);

export const books = pgTable("books", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  authors: jsonb("authors").notNull(),
  format: text("format").notNull(),
  mediaType: text("media_type").notNull(),
  originalFileName: text("original_file_name").notNull(),
  coverImageUrl: text("cover_image_url"),
  version,
  createdAt,
  updatedAt,
  deletedAt,
}, (table) => [
  index("books_user_updated_index").on(table.userId, table.updatedAt),
]);

export const libraryMemberships = pgTable("library_memberships", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  bookId: uuid("book_id").notNull().references(() => books.id, {
    onDelete: "cascade",
  }),
  state: text("state").notNull().default("active"),
  addedAt: timestamp("added_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  version,
  createdAt,
  updatedAt,
  deletedAt,
}, (table) => [
  unique("library_memberships_user_book_unique").on(
    table.userId,
    table.bookId,
  ),
]);

export const fileObjects = pgTable("file_objects", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  bookId: uuid("book_id").notNull().references(() => books.id, {
    onDelete: "cascade",
  }),
  sha256: text("sha256").notNull(),
  objectKey: text("object_key").notNull(),
  byteSize: bigint("byte_size", { mode: "number" }).notNull(),
  contentType: text("content_type").notNull(),
  originalFileName: text("original_file_name").notNull(),
  state: text("state").notNull().default("pending"),
  version,
  createdAt,
  updatedAt,
  deletedAt,
}, (table) => [
  unique("file_objects_user_sha256_unique").on(table.userId, table.sha256),
  unique("file_objects_object_key_unique").on(table.objectKey),
  index("file_objects_user_book_index").on(table.userId, table.bookId),
]);

export const readingPositions = pgTable("reading_positions", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  bookId: uuid("book_id").notNull().references(() => books.id, {
    onDelete: "cascade",
  }),
  locator: jsonb("locator").notNull(),
  version,
  createdAt,
  updatedAt,
  deletedAt,
}, (table) => [
  unique("reading_positions_user_book_unique").on(
    table.userId,
    table.bookId,
  ),
]);

export const highlights = pgTable("highlights", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  bookId: uuid("book_id").notNull().references(() => books.id, {
    onDelete: "cascade",
  }),
  locator: jsonb("locator").notNull(),
  selectedText: text("selected_text").notNull(),
  prefix: text("prefix").notNull(),
  suffix: text("suffix").notNull(),
  colorRole: text("color_role").notNull(),
  note: text("note"),
  version,
  createdAt,
  updatedAt,
  deletedAt,
}, (table) => [
  index("highlights_user_book_index").on(table.userId, table.bookId),
]);

export const bookmarks = pgTable("bookmarks", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  bookId: uuid("book_id").notNull().references(() => books.id, {
    onDelete: "cascade",
  }),
  locator: jsonb("locator").notNull(),
  label: text("label"),
  version,
  createdAt,
  updatedAt,
  deletedAt,
}, (table) => [
  index("bookmarks_user_book_index").on(table.userId, table.bookId),
]);

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  version,
  createdAt,
  updatedAt,
  deletedAt,
}, (table) => [
  index("collections_user_updated_index").on(table.userId, table.updatedAt),
]);

export const collectionMemberships = pgTable("collection_memberships", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  collectionId: uuid("collection_id").notNull().references(
    () => collections.id,
    { onDelete: "cascade" },
  ),
  bookId: uuid("book_id").notNull().references(() => books.id, {
    onDelete: "cascade",
  }),
  version,
  createdAt,
  updatedAt,
  deletedAt,
}, (table) => [
  unique("collection_memberships_user_collection_book_unique").on(
    table.userId,
    table.collectionId,
    table.bookId,
  ),
]);

export const mutationReceipts = pgTable("mutation_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  operationId: uuid("operation_id").notNull(),
  result: jsonb("result").notNull(),
  createdAt,
}, (table) => [
  unique("mutation_receipts_user_operation_unique").on(
    table.userId,
    table.operationId,
  ),
]);

export const changeLog = pgTable("change_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  sequence: bigserial("sequence", { mode: "number" }).notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  payload: jsonb("payload"),
  serverVersion: integer("server_version").notNull(),
  serverTimestamp: timestamp("server_timestamp", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
  originatingDeviceId: uuid("originating_device_id").notNull().references(
    () => devices.id,
    { onDelete: "cascade" },
  ),
}, (table) => [
  unique("change_log_sequence_unique").on(table.sequence),
  index("change_log_user_sequence_index").on(table.userId, table.sequence),
]);

export const entityHistory = pgTable("entity_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  version: integer("version").notNull(),
  payload: jsonb("payload"),
  recordedAt: timestamp("recorded_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
}, (table) => [
  index("entity_history_user_entity_index").on(
    table.userId,
    table.entityType,
    table.entityId,
  ),
]);
