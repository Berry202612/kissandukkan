"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { hitLimit, normalizeIdentifier } from "@/lib/rate-limit";
import { sendTemplate } from "@/lib/email";
import { siteUrl } from "@/lib/utils";
import { passwordRule } from "@/lib/validators";

export type AuthState = { ok: boolean; error?: string; redirectTo?: string } | null;

function safeNext(next: unknown, fallback: string) {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

export async function loginAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const scope = fd.get("scope") === "admin" ? "admin" : "customer";
  const locale = fd.get("locale") === "hi" ? "hi" : "en";
  try {
    await signIn("credentials", { identifier: String(fd.get("identifier") ?? ""), password: String(fd.get("password") ?? ""), scope, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      return { ok: false, error: code === "rate_limited" ? "rateLimited" : "invalid" };
    }
    throw e;
  }
  return { ok: true, redirectTo: safeNext(fd.get("next"), scope === "admin" ? "/admin" : `/${locale}/account`) };
}

const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email().max(160).optional().or(z.literal("")),
    mobile: z.string().trim().optional().or(z.literal("")),
    password: passwordRule,
    confirm: z.string(),
    locale: z.enum(["en", "hi"]).default("en"),
  })
  .refine((d) => d.email || d.mobile, { message: "needEmailOrMobile", path: ["email"] })
  .refine((d) => d.password === d.confirm, { message: "mismatch", path: ["confirm"] });

export async function registerAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message;
    const path = parsed.error.issues[0]?.path[0];
    return { ok: false, error: msg === "needEmailOrMobile" || msg === "mismatch" ? msg : path === "password" ? "passwordRule" : "invalid" };
  }
  const d = parsed.data;
  const mobile = d.mobile ? normalizeIdentifier(d.mobile) : "";
  if (mobile && !/^[6-9]\d{9}$/.test(mobile)) return { ok: false, error: "invalid" };
  if (await hitLimit(`register:${d.email || mobile}`, 5)) return { ok: false, error: "rateLimited" };
  const exists = await db.user.findFirst({ where: { OR: [...(d.email ? [{ email: d.email }] : []), ...(mobile ? [{ mobile }] : [])] } });
  if (exists) return { ok: false, error: "exists" };
  await db.user.create({ data: { name: d.name, email: d.email || null, mobile: mobile || null, passwordHash: await bcrypt.hash(d.password, 12), locale: d.locale } });
  try {
    await signIn("credentials", { identifier: d.email || mobile, password: d.password, scope: "customer", redirect: false });
  } catch {
    return { ok: true, redirectTo: `/${d.locale}/login` };
  }
  return { ok: true, redirectTo: safeNext(fd.get("next"), `/${d.locale}/account`) };
}

export async function logoutAction(fd: FormData) {
  const to = fd.get("to") === "admin" ? "/admin/login" : `/${fd.get("locale") === "hi" ? "hi" : "en"}`;
  await signOut({ redirectTo: to });
}

const hash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export async function forgotPasswordAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  const locale = fd.get("locale") === "hi" ? "hi" : "en";
  if (!email.success) return { ok: false, error: "invalid" };
  if (await hitLimit(`reset:${email.data}`, 3)) return { ok: true }; // do not reveal limits / existence
  const user = await db.user.findUnique({ where: { email: email.data } });
  if (user && !user.isBlocked) {
    const token = crypto.randomBytes(32).toString("base64url");
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    await sendTemplate("password_reset", user.locale ?? locale, user.email, { name: user.name, resetUrl: siteUrl(`/${user.locale ?? locale}/reset-password?token=${token}`) });
  }
  return { ok: true };
}

export async function resetPasswordAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = z.object({ token: z.string().min(20).max(200), password: passwordRule, confirm: z.string() }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: "passwordRule" };
  if (parsed.data.password !== parsed.data.confirm) return { ok: false, error: "mismatch" };
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hash(parsed.data.token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return { ok: false, error: "resetInvalid" };
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.passwordResetToken.deleteMany({ where: { userId: row.userId, usedAt: null } }),
  ]);
  return { ok: true };
}
