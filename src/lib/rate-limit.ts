import { db } from "./db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

export function normalizeIdentifier(raw: string) {
  const s = raw.trim().toLowerCase();
  if (s.includes("@")) return s;
  const digits = s.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

/** 5 failed attempts per identifier per 15 minutes (DB-backed so it works on serverless). */
export async function isRateLimited(identifier: string, max = MAX_FAILS) {
  const since = new Date(Date.now() - WINDOW_MS);
  const fails = await db.loginAttempt.count({ where: { identifier, success: false, createdAt: { gte: since } } });
  return fails >= max;
}

export async function recordAttempt(identifier: string, success: boolean) {
  await db.loginAttempt.create({ data: { identifier, success } });
  if (success) {
    await db.loginAttempt.deleteMany({ where: { identifier, success: false } });
  }
}

/** Generic limiter for forms (contact, reset password …) using the same table with a prefixed key. */
export async function hitLimit(key: string, max: number) {
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await db.loginAttempt.count({ where: { identifier: key, createdAt: { gte: since } } });
  if (count >= max) return true;
  await db.loginAttempt.create({ data: { identifier: key, success: false } });
  return false;
}
