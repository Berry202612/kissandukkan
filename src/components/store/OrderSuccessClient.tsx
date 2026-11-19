"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/brand/Illustration";

export function OrderSuccessClient({
  orderNumber,
  initialConfirmed,
  labels,
}: {
  orderNumber: string;
  initialConfirmed: boolean;
  labels: { title: string; text: string; pending: string; view: string; cont: string };
}) {
  const [confirmed, setConfirmed] = React.useState(initialConfirmed);
  React.useEffect(() => {
    if (confirmed) return;
    let n = 0;
    const id = setInterval(async () => {
      n++;
      const r = await fetch(`/api/orders/${orderNumber}/status`).catch(() => null);
      const d = r?.ok ? await r.json() : null;
      if (d && d.status !== "PAYMENT_PENDING") {
        setConfirmed(true);
        clearInterval(id);
      }
      if (n > 40) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [confirmed, orderNumber]);

  return (
    <div className="container mt-10">
      <div className="card relative mx-auto max-w-xl overflow-hidden p-8 text-center">
        <Illustration name="field" className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 text-primary/10" />
        {confirmed ? <CheckCircle2 className="mx-auto h-16 w-16 text-success" /> : <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />}
        <h1 className="mt-4 font-heading text-2xl font-bold">{labels.title}</h1>
        <p className="mt-2 text-muted" aria-live="polite">
          {confirmed ? labels.text : labels.pending}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild>
            <Link href={`/account/orders/${orderNumber}`}>{labels.view}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">{labels.cont}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
