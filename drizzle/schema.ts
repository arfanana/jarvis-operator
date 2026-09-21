import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const aiGenerations = mysqlTable("aiGenerations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  leadId: varchar("leadId", { length: 120 }),
  businessName: varchar("businessName", { length: 200 }).notNull(),
  kind: mysqlEnum("kind", ["outreach", "audit", "proposal"]).notNull(),
  tone: varchar("tone", { length: 32 }).notNull(),
  promptVersion: varchar("promptVersion", { length: 32 }).notNull(),
  prompt: text("prompt").notNull(),
  output: text("output").notNull(),
  model: varchar("model", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const rateLimits = mysqlTable("rateLimits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bucketStart: timestamp("bucketStart").notNull(),
  requestCount: int("requestCount").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userBucketUnique: uniqueIndex("rateLimitUserBucket").on(table.userId, table.bucketStart),
}));

export const emailDeliveries = mysqlTable("emailDeliveries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  leadId: varchar("leadId", { length: 120 }),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  provider: varchar("provider", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["sent", "failed"]).notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  error: text("error"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AiGeneration = typeof aiGenerations.$inferSelect;
export type EmailDelivery = typeof emailDeliveries.$inferSelect;
