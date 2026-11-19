// Vercel build: create/upgrade the database tables, add the starter content
// (create-only, never overwrites admin edits), then build the site.
import { execSync } from "node:child_process";

const env = { ...process.env };
if (!env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables.");
  process.exit(1);
}
// Migrations need a direct (non-pooled) connection. The Neon integration names it
// DATABASE_URL_UNPOOLED; fall back to DATABASE_URL if neither is set.
env.DIRECT_URL ||= env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL;

const run = (cmd) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env });
};

run("npx prisma generate");
run("npx prisma migrate deploy");
run("npx prisma db seed");
run("npx next build");
