import { z } from "zod";

/** min 8, at least one letter and one number */
export const passwordRule = z.string().min(8).max(100).regex(/[A-Za-z]/).regex(/[0-9]/);

export const indianMobile = z
  .string()
  .trim()
  .transform((s) => s.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "phone"));

export const addressSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  phone: indianMobile,
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/),
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).optional().default(""),
  landmark: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().max(80).optional().default(""),
  state: z.string().trim().min(2).max(60),
  isDefault: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).default(false),
});
