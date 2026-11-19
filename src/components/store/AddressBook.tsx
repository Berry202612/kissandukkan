"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/form";
import { deleteAddress, setDefaultAddress } from "@/app/actions/account";
import { AddressForm } from "./AddressForm";

type A = { id: string; name: string; phone: string; pincode: string; line1: string; line2: string | null; landmark: string | null; city: string; district: string | null; state: string; isDefault: boolean };

export function AddressBook({ addresses }: { addresses: A[] }) {
  const t = useTranslations("address");
  const tc = useTranslations("common");
  const tco = useTranslations("checkout");
  const router = useRouter();
  const [editing, setEditing] = React.useState<string | "new" | null>(addresses.length ? null : "new");
  const done = () => {
    setEditing(null);
    router.refresh();
  };
  return (
    <div className="space-y-4">
      {addresses.length === 0 && editing !== "new" && <p className="text-muted">{t("none")}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) =>
          editing === a.id ? (
            <Card key={a.id} className="p-5 md:col-span-2">
              <AddressForm initial={a} onSaved={done} />
            </Card>
          ) : (
            <Card key={a.id} className="p-5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{a.name}</p>
                {a.isDefault && <Badge>{t("defaultBadge")}</Badge>}
              </div>
              <p>{[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}</p>
              <p>
                {a.city}, {a.state} – {a.pincode}
              </p>
              <p className="text-muted">{a.phone}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(a.id)}>
                  {tc("edit")}
                </Button>
                {!a.isDefault && (
                  <Button size="sm" variant="ghost" onClick={async () => { await setDefaultAddress(a.id); router.refresh(); }}>
                    {t("default")}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-danger" onClick={async () => { await deleteAddress(a.id); router.refresh(); }}>
                  {tc("delete")}
                </Button>
              </div>
            </Card>
          ),
        )}
      </div>
      {editing === "new" ? (
        <Card className="p-5">
          <AddressForm onSaved={done} />
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setEditing("new")}>
          <Plus /> {tco("addAddress")}
        </Button>
      )}
    </div>
  );
}
