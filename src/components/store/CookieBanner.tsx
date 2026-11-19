"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/** Necessary-only cookies; this notice records acknowledgement only. */
export function CookieBanner() {
  const t = useTranslations("cookie");
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    setShow(!document.cookie.includes("kd_cookie_ack=1"));
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-[72px] z-50 mx-auto max-w-2xl rounded-2xl border border-line bg-white p-4 shadow-lift md:bottom-4" role="region" aria-label="Cookies">
      <p className="text-sm">{t("text")}</p>
      <div className="mt-3 flex items-center gap-3">
        <Button
          size="sm"
          onClick={() => {
            document.cookie = `kd_cookie_ack=1; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
            setShow(false);
          }}
        >
          {t("accept")}
        </Button>
        <Link href="/policies/cookie-policy" className="link text-sm">
          {t("more")}
        </Link>
      </div>
    </div>
  );
}
