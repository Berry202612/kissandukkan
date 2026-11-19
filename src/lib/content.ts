import "server-only";
import DOMPurify from "isomorphic-dompurify";
import { getBusiness, getDelivery, getPricing } from "./settings";

export function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "b", "i", "a", "br", "table", "thead", "tbody", "tr", "th", "td", "blockquote", "hr", "span"],
    ALLOWED_ATTR: ["href", "id", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/)/i,
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Replace business tokens in CMS HTML. Empty Business Details fields never render a placeholder:
 * single-value tokens fall back to neutral wording; *Block tokens render only the filled lines.
 */
export async function renderTokens(html: string, locale: "en" | "hi") {
  const [b, p, d] = await Promise.all([getBusiness(), getPricing(), getDelivery()]);
  const hi = locale === "hi";
  const line = (label: string, v: string, href?: string) => (v ? `<li><strong>${esc(label)}:</strong> ${href ? `<a href="${esc(href)}">${esc(v)}</a>` : esc(v)}</li>` : "");
  const grievance = [
    line(hi ? "नाम" : "Name", b.grievanceOfficerName),
    line(hi ? "ईमेल" : "Email", b.grievanceOfficerEmail || b.supportEmail, `mailto:${b.grievanceOfficerEmail || b.supportEmail}`),
    line(hi ? "फ़ोन" : "Phone", b.grievanceOfficerPhone, `tel:${b.grievanceOfficerPhone}`),
    line(hi ? "पता" : "Address", b.registeredAddress),
  ].join("");
  const contact = [
    line(hi ? "ईमेल" : "Email", b.supportEmail, `mailto:${b.supportEmail}`),
    line(hi ? "फ़ोन" : "Phone", b.supportPhone, `tel:${b.supportPhone}`),
    line("WhatsApp", b.whatsappNumber),
    line(hi ? "सहायता का समय" : "Support hours", b.supportHours),
    line(hi ? "रजिस्टर्ड पता" : "Registered address", b.registeredAddress),
  ].join("");
  const entity = [
    line(hi ? "कानूनी नाम" : "Legal name", b.legalName),
    line(hi ? "मूल कंपनी" : "Parent company", b.parentCompany),
    line(hi ? "ब्रांड नाम" : "Trade name", b.tradeName),
    line("GSTIN", b.gstin),
    line("CIN", b.cin),
    line(hi ? "आरओसी" : "ROC", b.rocName),
    line(hi ? "पंजीकरण संख्या" : "Registration number", b.registrationNo),
    line(hi ? "निगमन की तारीख" : "Date of incorporation", b.incorporationDate),
    line(hi ? "ईमेल" : "Email", b.supportEmail, `mailto:${b.supportEmail}`),
    line(hi ? "फ़ोन" : "Phone", b.supportPhone, `tel:${b.supportPhone.replace(/s/g, "")}`),
    line(hi ? "रजिस्टर्ड पता" : "Registered address", b.registeredAddress),
  ].join("");
  const licences = [
    line(hi ? "कीटनाशक लाइसेंस" : "Insecticide licence", b.pesticideLicenceNo),
    line(hi ? "खाद लाइसेंस" : "Fertilizer licence", b.fertilizerLicenceNo),
    line(hi ? "बीज लाइसेंस" : "Seed licence", b.seedLicenceNo),
    line(hi ? "जारी करने वाले" : "Issued by", b.licenceIssuingAuthority),
  ].join("");

  const tokens: Record<string, string> = {
    legalName: esc(b.legalName || b.tradeName || "KissanDukkan"),
    tradeName: esc(b.tradeName || "KissanDukkan"),
    supportEmail: b.supportEmail ? `<a href="mailto:${esc(b.supportEmail)}">${esc(b.supportEmail)}</a>` : hi ? "हमारे संपर्क पेज" : "our Contact page",
    grievanceBlock: grievance ? `<ul>${grievance}</ul>` : "",
    contactBlock: contact ? `<ul>${contact}</ul>` : "",
    entityBlock: entity ? `<ul>${entity}</ul>` : "",
    licenceBlock: licences ? `<ul>${licences}</ul>` : "",
    parentCompanySentence: b.parentCompany ? esc(hi ? `किसान दुकान, ${b.parentCompany} का एक उपक्रम है।` : `KissanDukkan is a venture of ${b.parentCompany}.`) : "",
    freeShippingThreshold: `₹${p.freeShippingThreshold}`,
    flatShippingFee: `₹${p.flatShippingFee}`,
    handlingFeePercent: `${p.handlingFeePercent}%`,
    handlingFeeMin: `₹${p.handlingFeeMin}`,
    handlingFeeMax: `₹${p.handlingFeeMax}`,
    replacementWindowHours: String(d.replacementWindowHours),
    ownStockEta: `${d.ownStockMinDays}–${d.ownStockMaxDays}`,
    supplierEta: `${d.supplierMinDays}–${d.supplierMaxDays}`,
    surfaceExtraDays: String(d.surfaceExtraDays),
    paymentWindowMinutes: String(d.paymentWindowMinutes),
  };
  const out = html.replace(/\{\{(\w+)\}\}/g, (_, k: string) => tokens[k] ?? "");
  // Remove paragraphs/list items left empty after token replacement.
  return out.replace(/<(p|li)>\s*<\/\1>/g, "");
}

/** Adds ids to h2 headings and returns a table of contents. */
export function withToc(html: string) {
  const toc: { id: string; text: string }[] = [];
  let n = 0;
  const body = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const id = `s-${++n}`;
    toc.push({ id, text });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { body, toc };
}
