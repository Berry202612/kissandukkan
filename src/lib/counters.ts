import { Prisma } from "@prisma/client";
import { db } from "./db";

type Tx = Prisma.TransactionClient | typeof db;

async function next(key: string, tx: Tx = db) {
  const row = await tx.counter.upsert({ where: { key }, create: { key, value: 1 }, update: { value: { increment: 1 } } });
  return row.value;
}

function istYear(d = new Date()) {
  return Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", year: "numeric" }).format(d));
}
function istMonth(d = new Date()) {
  return Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "numeric" }).format(d));
}

/** KD-2026-000001 */
export async function nextOrderNumber(tx?: Tx) {
  const y = istYear();
  const n = await next(`order-${y}`, tx);
  return `KD-${y}-${String(n).padStart(6, "0")}`;
}

/** Indian financial year (Apr–Mar): KD/2026-27/000001 */
export function financialYear(d = new Date()) {
  const y = istYear(d);
  const start = istMonth(d) >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export async function nextInvoiceNumber(tx?: Tx) {
  const fy = financialYear();
  const n = await next(`invoice-${fy}`, tx);
  return `KD/${fy}/${String(n).padStart(6, "0")}`;
}
