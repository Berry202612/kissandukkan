import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/en/account", "/hi/account", "/en/checkout", "/hi/checkout", "/en/cart", "/hi/cart"] }],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
