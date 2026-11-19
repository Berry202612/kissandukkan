import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "./db";
import { getBusiness, getPricing } from "./settings";
import { splitGst } from "./pricing";
import { toNum } from "./utils";

const green = rgb(0.118, 0.42, 0.227);
const ink = rgb(0.11, 0.14, 0.125);
const muted = rgb(0.42, 0.48, 0.44);

// Standard PDF fonts are WinAnsi only: use "Rs." and strip non-Latin characters.
const latin = (s: string) => s.replace(/[^\x20-\x7E]/g, "").trim();
const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = latin(text).split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) > width && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** GST tax invoice. Contains NO supplier or cost data – only seller (Business Details) and customer info. */
export async function renderInvoicePdf(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      invoiceNumber: true,
      invoicedAt: true,
      shippingAddress: true,
      subtotal: true,
      discount: true,
      shippingFee: true,
      handlingFee: true,
      codFee: true,
      total: true,
      paymentMethod: true,
      razorpayPaymentId: true,
      items: { select: { name_en: true, packLabel: true, hsnCode: true, gstRate: true, unitPrice: true, quantity: true, lineTotal: true } },
    },
  });
  if (!order?.invoiceNumber) return null;
  const [b, pricing] = await Promise.all([getBusiness(), getPricing()]);
  const addr = order.shippingAddress as Record<string, string | null>;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = pdf.addPage([595, 842]);
  let y = 800;
  const L = 40;
  const text = (s: string, x: number, size = 9, f = font, color = ink) => page.drawText(latin(s), { x, y, size, font: f, color });

  page.drawRectangle({ x: 0, y: 812, width: 595, height: 30, color: green });
  page.drawText("TAX INVOICE", { x: L, y: 822, size: 13, font: bold, color: rgb(1, 1, 1) });
  page.drawText(latin(b.tradeName || "KissanDukkan"), { x: 420, y: 822, size: 13, font: bold, color: rgb(1, 1, 1) });
  y = 790;

  // Seller
  text("Sold by", L, 8, bold, muted);
  y -= 12;
  if (b.legalName) { text(b.legalName, L, 10, bold); y -= 12; }
  for (const line of wrap(b.registeredAddress, font, 9, 250)) { text(line, L); y -= 11; }
  if (b.gstin) { text(`GSTIN: ${b.gstin}`, L); y -= 11; }
  if (b.pesticideLicenceNo) { text(`Pesticide licence: ${b.pesticideLicenceNo}`, L); y -= 11; }
  if (b.fertilizerLicenceNo) { text(`Fertilizer licence: ${b.fertilizerLicenceNo}`, L); y -= 11; }
  if (b.seedLicenceNo) { text(`Seed licence: ${b.seedLicenceNo}`, L); y -= 11; }
  if (b.supportEmail) { text(`Email: ${b.supportEmail}`, L); y -= 11; }
  const sellerBottom = y;

  // Invoice meta (right column)
  y = 778;
  const R = 330;
  const meta: [string, string][] = [
    ["Invoice no.", order.invoiceNumber],
    ["Invoice date", (order.invoicedAt ?? new Date()).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })],
    ["Order no.", order.orderNumber],
    ["Payment", order.paymentMethod === "RAZORPAY" ? `Online (Razorpay)${order.razorpayPaymentId ? " " + order.razorpayPaymentId : ""}` : "Cash on delivery"],
  ];
  for (const [k, v] of meta) { text(k, R, 8, bold, muted); text(v, R + 70, 9); y -= 12; }
  y -= 6;
  text("Bill / Ship to", R, 8, bold, muted);
  y -= 12;
  text(addr.name ?? "", R, 10, bold);
  y -= 12;
  for (const line of wrap([addr.line1, addr.line2, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(", "), font, 9, 220)) { text(line, R); y -= 11; }
  text(`Phone: ${addr.phone ?? ""}`, R);
  y -= 11;
  text(`Place of supply: ${addr.state ?? ""}`, R);
  y = Math.min(y, sellerBottom) - 16;

  // Items table
  const cols = [L, 250, 300, 340, 400, 450];
  page.drawRectangle({ x: L - 4, y: y - 4, width: 523, height: 16, color: rgb(0.91, 0.953, 0.925) });
  ["Item", "HSN", "GST %", "Unit price", "Qty", "Amount (incl. GST)"].forEach((h, i) => text(h, cols[i], 8, bold));
  y -= 18;
  const byRate = new Map<number, number>();
  for (const it of order.items) {
    if (y < 120) { page = pdf.addPage([595, 842]); y = 800; }
    const nameLines = wrap(`${it.name_en} (${it.packLabel})`, font, 9, 200);
    text(nameLines[0] ?? "", cols[0]);
    text(it.hsnCode || "-", cols[1]);
    text(String(toNum(it.gstRate)), cols[2]);
    text(rs(toNum(it.unitPrice)), cols[3]);
    text(String(it.quantity), cols[4] + 10);
    text(rs(toNum(it.lineTotal)), cols[5]);
    for (const extra of nameLines.slice(1)) { y -= 11; text(extra, cols[0]); }
    y -= 14;
    byRate.set(toNum(it.gstRate), (byRate.get(toNum(it.gstRate)) ?? 0) + toNum(it.lineTotal));
  }
  const subtotal = toNum(order.subtotal);
  const discount = toNum(order.discount);
  if (discount > 0 && subtotal > 0) for (const [r, g] of byRate) byRate.set(r, g - (discount * g) / subtotal);
  const svcRate = pricing.serviceGstRate;
  const svc = toNum(order.shippingFee) + toNum(order.handlingFee) + toNum(order.codFee);
  if (svc > 0) byRate.set(svcRate, (byRate.get(svcRate) ?? 0) + svc);

  y -= 6;
  page.drawLine({ start: { x: L - 4, y: y + 8 }, end: { x: 559, y: y + 8 }, thickness: 0.5, color: muted });
  const totals: [string, number][] = [["Subtotal", subtotal]];
  if (discount > 0) totals.push(["Coupon discount", -discount]);
  totals.push(["Shipping", toNum(order.shippingFee)]);
  totals.push(["Payment & Handling Fee", toNum(order.handlingFee)]);
  if (toNum(order.codFee) > 0) totals.push(["COD fee", toNum(order.codFee)]);
  for (const [k, v] of totals) { text(k, 340, 9); text(rs(v), 450, 9); y -= 13; }
  text("Grand total", 340, 10, bold);
  text(rs(toNum(order.total)), 450, 10, bold);
  y -= 22;

  // GST summary
  text("GST summary (prices are inclusive of GST)", L, 8, bold, muted);
  y -= 13;
  const intra = Boolean(b.gstin && addr.state && b.registeredAddress.toLowerCase().includes(String(addr.state).toLowerCase()));
  ["Rate", "Taxable value", intra ? "CGST" : "IGST", intra ? "SGST" : "", "Total tax"].forEach((h, i) => h && text(h, L + i * 100, 8, bold));
  y -= 12;
  for (const [rate, gross] of [...byRate].sort((a, c) => a[0] - c[0])) {
    const { taxable, tax } = splitGst(gross, rate);
    text(`${rate}%`, L);
    text(rs(taxable), L + 100);
    if (intra) { text(rs(tax / 2), L + 200); text(rs(tax / 2), L + 300); } else text(rs(tax), L + 200);
    text(rs(tax), L + 400);
    y -= 12;
  }
  y -= 16;
  for (const line of wrap("This is a computer-generated invoice. Batch number and expiry date are printed on each product pack. For help, write to us at the support email above.", font, 8, 515)) {
    text(line, L, 8, font, muted);
    y -= 10;
  }
  return pdf.save();
}
