import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { aiGenerations, emailDeliveries, InsertUser, rateLimits, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
const fallbackAiBuckets = new Map<string, number>();

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function consumeAiRateLimit(userKey: string, maxRequests = 50) {
  const now = Date.now();
  const bucketTime = new Date(Math.floor(now / 3_600_000) * 3_600_000);
  const fallbackKey = `${userKey}:${bucketTime.toISOString()}`;
  const db = await getDb();
  if (!db) {
    const next = (fallbackAiBuckets.get(fallbackKey) ?? 0) + 1;
    if (next > maxRequests) throw new Error(`AI rate limit reached. Try again after ${new Date(bucketTime.getTime() + 3_600_000).toLocaleTimeString("en-IN")}.`);
    fallbackAiBuckets.set(fallbackKey, next);
    return { count: next, limit: maxRequests, resetAt: new Date(bucketTime.getTime() + 3_600_000) };
  }
  const userId = Number(userKey);
  const existing = await db.select().from(rateLimits).where(and(eq(rateLimits.userId, userId), eq(rateLimits.bucketStart, bucketTime))).limit(1);
  const next = (existing[0]?.requestCount ?? 0) + 1;
  if (next > maxRequests) throw new Error(`AI rate limit reached. Try again after ${new Date(bucketTime.getTime() + 3_600_000).toLocaleTimeString("en-IN")}.`);
  if (existing[0]) {
    await db.update(rateLimits).set({ requestCount: next, updatedAt: new Date() }).where(eq(rateLimits.id, existing[0].id));
  } else {
    await db.insert(rateLimits).values({ userId, bucketStart: bucketTime, requestCount: 1 });
  }
  return { count: next, limit: maxRequests, resetAt: new Date(bucketTime.getTime() + 3_600_000) };
}

export async function recordAiGeneration(input: typeof aiGenerations.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(aiGenerations).values(input);
  return result;
}

export async function listAiGenerations(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiGenerations).where(eq(aiGenerations.userId, userId)).orderBy(desc(aiGenerations.createdAt)).limit(limit);
}

export async function recordEmailDelivery(input: typeof emailDeliveries.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(emailDeliveries).values(input);
}
