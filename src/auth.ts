import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import authConfig from "./auth.config";
import { db } from "./lib/db";
import { isRateLimited, recordAttempt, normalizeIdentifier } from "./lib/rate-limit";

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}
class InvalidLogin extends CredentialsSignin {
  code = "invalid";
}

const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(120),
  password: z.string().min(1).max(200),
  scope: z.enum(["customer", "admin"]).default("customer"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { identifier: {}, password: {}, scope: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) throw new InvalidLogin();
        const { password, scope } = parsed.data;
        const identifier = normalizeIdentifier(parsed.data.identifier);
        if (await isRateLimited(identifier)) throw new RateLimited();

        const user = await db.user.findFirst({
          where: identifier.includes("@") ? { email: identifier } : { mobile: identifier },
        });
        const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
        const roleOk = user && (scope === "admin" ? user.role !== "CUSTOMER" : true);
        if (!user || !ok || user.isBlocked || !roleOk) {
          await recordAttempt(identifier, false);
          throw new InvalidLogin();
        }
        await recordAttempt(identifier, true);
        return { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions };
      },
    }),
  ],
});
