import "server-only";
import { cache } from "react";
import { z } from "zod";
import { db } from "./db";

const opt = z.string().trim().max(500).optional().default("");

export const businessSchema = z.object({
  legalName: opt,
  parentCompany: opt,
  tradeName: z.string().trim().max(120).default("KissanDukkan"),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Invalid GSTIN")
    .optional()
    .default(""),
  cin: opt,
  pan: z.string().trim().toUpperCase().regex(/^$|^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN").optional().default(""),
  registeredAddress: opt,
  pickupAddress: opt,
  pickupPincode: z.string().trim().regex(/^$|^[1-9][0-9]{5}$/).optional().default(""),
  shiprocketPickupLocation: opt,
  grievanceOfficerName: opt,
  grievanceOfficerEmail: z.string().trim().email().or(z.literal("")).optional().default(""),
  grievanceOfficerPhone: opt,
  supportEmail: z.string().trim().email().or(z.literal("")).optional().default("support@kissandukkan.in"),
  supportPhone: opt,
  whatsappNumber: z.string().trim().regex(/^$|^\+?[0-9]{10,13}$/, "Digits only, with country code").optional().default(""),
  supportHours: opt,
  pesticideLicenceNo: opt,
  fertilizerLicenceNo: opt,
  seedLicenceNo: opt,
  licenceIssuingAuthority: opt,
  instagram: z.string().trim().url().or(z.literal("")).optional().default(""),
  facebook: z.string().trim().url().or(z.literal("")).optional().default(""),
  youtube: z.string().trim().url().or(z.literal("")).optional().default(""),
  androidAppUrl: z.string().trim().url().or(z.literal("")).optional().default(""),
  iosAppUrl: z.string().trim().url().or(z.literal("")).optional().default(""),
});
export type BusinessDetails = z.infer<typeof businessSchema>;

export const pricingSchema = z.object({
  markupPercent: z.coerce.number().min(0).max(100).default(1),
  handlingFeePercent: z.coerce.number().min(0).max(10).default(2),
  handlingFeeMin: z.coerce.number().min(0).default(10),
  handlingFeeMax: z.coerce.number().min(0).default(200),
  freeShippingThreshold: z.coerce.number().min(0).default(999),
  shippingMode: z.enum(["FLAT", "WEIGHT"]).default("FLAT"),
  flatShippingFee: z.coerce.number().min(0).default(79),
  weightRates: z
    .array(z.object({ upToGrams: z.coerce.number().int().positive(), fee: z.coerce.number().min(0) }))
    .default([
      { upToGrams: 1000, fee: 59 },
      { upToGrams: 3000, fee: 89 },
      { upToGrams: 5000, fee: 129 },
      { upToGrams: 10000, fee: 199 },
    ]),
  extraPerKgAboveMax: z.coerce.number().min(0).default(20),
  codEnabled: z.coerce.boolean().default(false),
  codLimit: z.coerce.number().min(0).default(3000),
  codFee: z.coerce.number().min(0).default(49),
  razorpayFeePercent: z.coerce.number().min(0).default(2),
  razorpayGstPercent: z.coerce.number().min(0).default(18),
  serviceGstRate: z.coerce.number().min(0).default(18),
});
export type PricingSettings = z.infer<typeof pricingSchema>;

export const deliverySchema = z.object({
  ownStockMinDays: z.coerce.number().int().min(0).default(2),
  ownStockMaxDays: z.coerce.number().int().min(0).default(4),
  supplierMinDays: z.coerce.number().int().min(0).default(5),
  supplierMaxDays: z.coerce.number().int().min(0).default(8),
  surfaceExtraDays: z.coerce.number().int().min(0).default(2),
  reviewRequestDelayDays: z.coerce.number().int().min(1).default(7),
  replacementWindowHours: z.coerce.number().int().min(1).default(48),
  paymentWindowMinutes: z.coerce.number().int().min(5).default(30),
});
export type DeliverySettings = z.infer<typeof deliverySchema>;

export const launchSchema = z.object({
  policiesLegalReviewed: z.coerce.boolean().default(false),
  taxTableVerified: z.coerce.boolean().default(false),
  razorpayWebsiteReviewed: z.coerce.boolean().default(false),
});
export type LaunchSettings = z.infer<typeof launchSchema>;

const schemas = { business: businessSchema, pricing: pricingSchema, delivery: deliverySchema, launch: launchSchema };
type Key = keyof typeof schemas;
type ValueOf<K extends Key> = z.infer<(typeof schemas)[K]>;

async function read<K extends Key>(key: K): Promise<ValueOf<K>> {
  const schema = schemas[key];
  try {
    const row = await db.setting.findUnique({ where: { key } });
    const parsed = schema.safeParse(row?.value ?? {});
    if (parsed.success) return parsed.data as ValueOf<K>;
  } catch (e) {
    console.error(`[settings] failed to load ${key}`, e);
  }
  return schema.parse({}) as ValueOf<K>;
}

export const getBusiness = cache(() => read("business"));
export const getPricing = cache(() => read("pricing"));
export const getDelivery = cache(() => read("delivery"));
export const getLaunch = cache(() => read("launch"));

export async function saveSetting<K extends Key>(key: K, value: unknown): Promise<ValueOf<K>> {
  const parsed = schemas[key].parse(value) as ValueOf<K>;
  await db.setting.upsert({ where: { key }, create: { key, value: parsed }, update: { value: parsed } });
  return parsed;
}
