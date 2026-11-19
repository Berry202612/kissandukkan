import "server-only";
import { auth } from "@/auth";
import { db } from "./db";

export class AuthError extends Error {}

export async function currentUser() {
  const s = await auth();
  if (!s?.user?.id) return null;
  return s.user;
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new AuthError("unauthorized");
  const row = await db.user.findUnique({ where: { id: u.id }, select: { isBlocked: true } });
  if (!row || row.isBlocked) throw new AuthError("unauthorized");
  return u;
}

/** Staff or admin. Pass a permission (e.g. "view_costs") to require it for STAFF. ADMIN always passes. */
export async function requireStaff(permission?: string) {
  const u = await requireUser();
  if (u.role === "ADMIN") return u;
  if (u.role !== "STAFF") throw new AuthError("forbidden");
  if (permission) {
    const row = await db.user.findUnique({ where: { id: u.id }, select: { permissions: true } });
    if (!row?.permissions.includes(permission)) throw new AuthError("forbidden");
  }
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new AuthError("forbidden");
  return u;
}

export function canViewCosts(u: { role: string; permissions: string[] }) {
  return u.role === "ADMIN" || u.permissions.includes("view_costs");
}

export async function audit(userId: string | null, action: string, entity: string, entityId?: string, meta?: object) {
  try {
    await db.auditLog.create({ data: { userId, action, entity, entityId, meta: meta as object | undefined } });
  } catch (e) {
    console.error("[audit]", e);
  }
}
