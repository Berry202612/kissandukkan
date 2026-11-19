"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { L, inputCls } from "./ui";
import { SubmitButton } from "./SubmitButton";

type Opt = { id: string; name: string };
type P = Record<string, unknown> & { id?: string; crops?: { cropId: string }[] };

const ta = "min-h-[110px] w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";

export function ProductForm({
  action,
  product,
  categories,
  subCategories,
  brands,
  crops,
}: {
  action: (fd: FormData) => Promise<void>;
  product?: P;
  categories: Opt[];
  subCategories: (Opt & { categoryId: string })[];
  brands: Opt[];
  crops: Opt[];
}) {
  const [tab, setTab] = React.useState<"en" | "hi" | "tech" | "legal">("en");
  const [cat, setCat] = React.useState(String(product?.categoryId ?? categories[0]?.id ?? ""));
  const v = (k: string) => (product?.[k] == null ? "" : String(product[k]));
  const arr = (k: string) => ((product?.[k] as string[] | undefined) ?? []).join("\n");
  const csv = (k: string) => ((product?.[k] as string[] | undefined) ?? []).join(", ");
  const chk = (k: string) => Boolean(product?.[k]);
  const selectedCrops = new Set((product?.crops ?? []).map((c) => c.cropId));
  const date = product?.expiryDate ? new Date(product.expiryDate as string).toISOString().slice(0, 10) : "";
  const tabs = [
    ["en", "English content"],
    ["hi", "Hindi content"],
    ["tech", "Technical & dosage"],
    ["legal", "Legal, tax & delivery"],
  ] as const;

  return (
    <form action={action} className="card p-5">
      {product?.id && <input type="hidden" name="id" value={String(product.id)} />}
      <div className="grid gap-4 md:grid-cols-2">
        <L label="Name (English)">
          <input name="name_en" defaultValue={v("name_en")} required className={cn(inputCls, "w-full")} />
        </L>
        <L label="Name (Hindi)">
          <input name="name_hi" defaultValue={v("name_hi")} className={cn(inputCls, "w-full")} lang="hi" />
        </L>
        <L label="URL slug" hint="Leave empty to generate from the English name">
          <input name="slug" defaultValue={v("slug")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="Brand">
          <select name="brandId" defaultValue={v("brandId")} className={cn(inputCls, "w-full")}>
            <option value="">— none —</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </L>
        <L label="Category">
          <select name="categoryId" value={cat} onChange={(e) => setCat(e.target.value)} className={cn(inputCls, "w-full")} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </L>
        <L label="Sub-category">
          <select name="subCategoryId" defaultValue={v("subCategoryId")} className={cn(inputCls, "w-full")} key={cat}>
            <option value="">— none —</option>
            {subCategories.filter((s) => s.categoryId === cat).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </L>
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-line">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cn("min-h-[40px] border-b-[3px] px-4 text-sm font-semibold", tab === k ? "border-accent text-primary-dark" : "border-transparent text-muted")}>
            {label}
          </button>
        ))}
      </div>

      {(["en", "hi"] as const).map((lng) => (
        <div key={lng} className={cn("mt-5 grid gap-4", tab !== lng && "hidden")} lang={lng}>
          <L label="Short description">
            <textarea name={`shortDescription_${lng}`} defaultValue={v(`shortDescription_${lng}`)} className={cn(ta, "min-h-[70px]")} />
          </L>
          <L label="Full description" hint="Original text only. Blank line = new paragraph.">
            <textarea name={`description_${lng}`} defaultValue={v(`description_${lng}`)} className={cn(ta, "min-h-[200px]")} />
          </L>
          <L label="Key benefits (one per line)">
            <textarea name={`keyFeatures_${lng}`} defaultValue={arr(`keyFeatures_${lng}`)} className={ta} />
          </L>
          <div className="grid gap-4 md:grid-cols-2">
            <L label="Dosage">
              <textarea name={`dosage_${lng}`} defaultValue={v(`dosage_${lng}`)} className={ta} />
            </L>
            <L label="How to use">
              <textarea name={`howToUse_${lng}`} defaultValue={v(`howToUse_${lng}`)} className={ta} />
            </L>
          </div>
          <L label="Safety & precautions">
            <textarea name={`safety_${lng}`} defaultValue={v(`safety_${lng}`)} className={ta} />
          </L>
          {lng === "hi" && (
            <label className="flex items-center gap-2 rounded-xl bg-accent-light p-3 text-sm font-semibold">
              <input type="checkbox" name="hiReviewed" defaultChecked={chk("hiReviewed")} className="h-5 w-5 accent-primary" /> Hindi text reviewed by a native speaker
            </label>
          )}
        </div>
      ))}

      <div className={cn("mt-5 grid gap-4 md:grid-cols-2", tab !== "tech" && "hidden")}>
        <L label="Technical content" hint="e.g. Imidacloprid 17.8% SL">
          <input name="technicalContent" defaultValue={v("technicalContent")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="Formulation" hint="e.g. SL, EC, WP, WG, granules">
          <input name="formulation" defaultValue={v("formulation")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="Active ingredients (comma separated)" hint="Checked against the Restricted ingredients list">
          <input name="activeIngredients" defaultValue={csv("activeIngredients")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="Target pests / diseases / use (comma separated)">
          <input name="targetPests" defaultValue={csv("targetPests")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="Compatibility" className="md:col-span-2">
          <input name="compatibility" defaultValue={v("compatibility")} className={cn(inputCls, "w-full")} />
        </L>
        <fieldset className="md:col-span-2">
          <legend className="mb-1 text-sm font-semibold">Suitable crops</legend>
          <div className="flex flex-wrap gap-2">
            {crops.map((c) => (
              <label key={c.id} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm">
                <input type="checkbox" name="cropIds" value={c.id} defaultChecked={selectedCrops.has(c.id)} className="accent-primary" /> {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <L label="Dosage calculator: quantity per acre" hint="Leave empty to hide the calculator">
          <input name="dosePerAcre" type="number" step="0.001" min="0" defaultValue={v("dosePerAcre")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="Dosage calculator: quantity per litre of water">
          <input name="dosePerLitre" type="number" step="0.001" min="0" defaultValue={v("dosePerLitre")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="Dose unit">
          <select name="doseUnit" defaultValue={v("doseUnit")} className={cn(inputCls, "w-full")}>
            <option value="">—</option>
            <option>ml</option>
            <option>g</option>
            <option>kg</option>
            <option>L</option>
          </select>
        </L>
      </div>

      <div className={cn("mt-5 grid gap-4 md:grid-cols-3", tab !== "legal" && "hidden")}>
        <L label="Manufacturer name">
          <input name="manufacturerName" defaultValue={v("manufacturerName")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="Manufacturer address" className="md:col-span-2">
          <input name="manufacturerAddress" defaultValue={v("manufacturerAddress")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="Country of origin">
          <input name="countryOfOrigin" defaultValue={v("countryOfOrigin") || "India"} className={cn(inputCls, "w-full")} />
        </L>
        <L label="Licence type" hint="Shows the matching dealer licence number">
          <select name="licenceType" defaultValue={v("licenceType") || "NONE"} className={cn(inputCls, "w-full")}>
            <option>NONE</option>
            <option>PESTICIDE</option>
            <option>FERTILIZER</option>
            <option>SEED</option>
          </select>
        </L>
        <L label="Min. shelf life on delivery (months)">
          <input name="minShelfLifeMonths" type="number" min="0" defaultValue={v("minShelfLifeMonths")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="HSN override" hint="Empty = from Tax settings">
          <input name="hsnCode" defaultValue={v("hsnCode")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="GST % override" hint="Empty = from Tax settings">
          <input name="gstRate" type="number" step="0.01" min="0" defaultValue={v("gstRate")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="Fulfilled by">
          <select name="fulfilledBy" defaultValue={v("fulfilledBy") || "SUPPLIER_DIRECT"} className={cn(inputCls, "w-full")}>
            <option value="SUPPLIER_DIRECT">Supplier direct</option>
            <option value="OWN_STOCK">Own stock (Shiprocket)</option>
          </select>
        </L>
        <L label="Batch no. (own stock only, optional)">
          <input name="batchNo" defaultValue={v("batchNo")} className={cn(inputCls, "w-full")} />
        </L>
        <L label="Expiry date (own stock only, optional)">
          <input name="expiryDate" type="date" defaultValue={date} className={cn(inputCls, "w-full")} />
        </L>
        <input type="hidden" name="imageStatus" value={v("imageStatus") || "CATEGORY_FALLBACK"} />
        <div className="flex flex-col gap-2 md:col-span-3">
          {[
            ["mrpVerified", "MRP of every pack size checked against the printed pack"],
            ["isOrganic", "Organic / bio input"],
            ["surfaceOnly", "Surface transport only (liquids / hazardous)"],
            ["isFeatured", "Featured on homepage"],
            ["isOrganicPick", "Show in “Organic picks”"],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={k} defaultChecked={chk(k)} className="h-4 w-4 accent-primary" /> {label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
        <SubmitButton>{product?.id ? "Save product" : "Create draft"}</SubmitButton>
        <span className="text-xs text-muted">All tabs are saved together.</span>
      </div>
    </form>
  );
}
