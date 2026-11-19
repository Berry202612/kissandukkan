/**
 * One-time creation of the first ADMIN account. No default passwords exist anywhere.
 *   npm run create-admin
 * Non-interactive (CI): ADMIN_EMAIL=… ADMIN_PASSWORD=… ADMIN_NAME=… npm run create-admin
 */
import readline from "readline";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function ask(q: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    out._writeToOutput = (s: string) => {
      if (s.includes(q)) out.output.write(s);
      else out.output.write("*");
    };
  }
  return new Promise((resolve) =>
    rl.question(q, (a) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(a.trim());
    }),
  );
}

async function main() {
  const name = process.env.ADMIN_NAME || (await ask("Admin name: "));
  const email = (process.env.ADMIN_EMAIL || (await ask("Admin email: "))).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email");
  const password = process.env.ADMIN_PASSWORD || (await ask("Password (min 8, letter + number): ", true));
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) throw new Error("Password must be at least 8 characters with a letter and a number");
  if (!process.env.ADMIN_PASSWORD) {
    const again = await ask("Repeat password: ", true);
    if (again !== password) throw new Error("Passwords do not match");
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({ where: { email }, data: { role: "ADMIN", permissions: ["view_costs"], isBlocked: false } });
    console.log(`Existing user ${email} promoted to ADMIN (password unchanged).`);
  } else {
    await db.user.create({ data: { name: name || "Admin", email, role: "ADMIN", permissions: ["view_costs"], passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`Admin ${email} created. Log in at /admin/login`);
  }
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
