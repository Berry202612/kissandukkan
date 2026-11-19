import { NextResponse } from "next/server";
import { sendDueReviewRequests } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sent = await sendDueReviewRequests();
  return NextResponse.json({ sent });
}
