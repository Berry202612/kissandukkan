import "server-only";
import { db } from "./db";
import { defaultTemplates, type TemplateKey } from "./email-defaults";
import { getBusiness } from "./settings";
import { siteUrl } from "./utils";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Fill {{vars}}. Values are HTML-escaped unless the key is listed in `raw`. */
export function fill(tpl: string, vars: Record<string, string>, raw: string[] = []) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    const v = vars[k] ?? "";
    return raw.includes(k) ? v : esc(v);
  });
}

async function layout(inner: string, locale: "en" | "hi") {
  const b = await getBusiness();
  const footer = [b.legalName || b.tradeName, b.registeredAddress, b.supportEmail].filter(Boolean).map(esc).join(" · ");
  return `<!doctype html><html lang="${locale}"><body style="margin:0;background:#FBF8F1;font-family:'Noto Sans','Noto Sans Devanagari',Arial,sans-serif;color:#1C2420">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="600" style="max-width:600px;background:#fff;border-radius:16px;border:1px solid #E4DFD3" cellpadding="0" cellspacing="0">
<tr><td style="background:#1E6B3A;border-radius:16px 16px 0 0;padding:18px 24px;font-size:22px;font-weight:700;color:#fff">Kissan<span style="color:#F4B400">Dukkan</span></td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.6">${inner}</td></tr>
<tr><td style="padding:16px 24px;font-size:12px;color:#6B7A70;border-top:1px solid #E4DFD3">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

async function getTemplate(key: TemplateKey, locale: "en" | "hi") {
  try {
    const row = await db.emailTemplate.findUnique({ where: { key_locale: { key, locale } } });
    if (row) return { subject: row.subject, body: row.body };
  } catch {
    /* fall back to defaults */
  }
  return defaultTemplates[key][locale];
}

export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "support@kissandukkan.in";
  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set – email to ${to} not sent: "${subject}"`);
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `KissanDukkan <${from}>`, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error("[email] Resend error", res.status, await res.text().catch(() => ""));
    return { sent: false };
  }
  return { sent: true };
}

export async function sendTemplate(key: TemplateKey, locale: "en" | "hi", to: string | null | undefined, vars: Record<string, string>, raw: string[] = []) {
  if (!to) return { sent: false };
  const t = await getTemplate(key, locale);
  const html = await layout(fill(t.body, vars, raw), locale);
  return sendEmail(to, fill(t.subject, vars), html);
}

export function itemsTable(items: { name: string; qty: number; price: string }[], locale: "en" | "hi") {
  const h = locale === "hi" ? ["सामान", "मात्रा", "राशि"] : ["Item", "Qty", "Amount"];
  return `<table width="100%" cellpadding="6" style="border-collapse:collapse;font-size:14px;margin:12px 0"><tr style="background:#E8F3EC"><th align="left">${h[0]}</th><th>${h[1]}</th><th align="right">${h[2]}</th></tr>${items
    .map((i) => `<tr style="border-bottom:1px solid #E4DFD3"><td>${esc(i.name)}</td><td align="center">${i.qty}</td><td align="right">${esc(i.price)}</td></tr>`)
    .join("")}</table>`;
}

export const trackUrl = (locale: string, orderNumber: string) => siteUrl(`/${locale}/track?order=${encodeURIComponent(orderNumber)}`);
