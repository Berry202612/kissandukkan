import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentUser } from "@/lib/session";
import { hitLimit } from "@/lib/rate-limit";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4"];
const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 20 * 1024 * 1024;

// Magic-byte checks so a renamed file cannot pass as an image/video.
function sniff(buf: Uint8Array) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45) return "image/webp";
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return "video/mp4";
  return null;
}

/** purpose: "product" (staff only), "review" | "return" (logged-in customers). */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "login" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
  const form = await req.formData();
  const purpose = String(form.get("purpose") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (purpose === "product" && u.role === "CUSTOMER") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!["product", "banner", "review", "return"].includes(purpose)) return NextResponse.json({ error: "purpose" }, { status: 400 });
  if (purpose === "banner" && u.role === "CUSTOMER") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (u.role === "CUSTOMER" && (await hitLimit(`upload:${u.id}`, 30))) return NextResponse.json({ error: "rate" }, { status: 429 });

  const allowVideo = purpose === "return";
  const buf = new Uint8Array(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || !(IMAGE_TYPES.includes(type) || (allowVideo && VIDEO_TYPES.includes(type)))) return NextResponse.json({ error: "type" }, { status: 400 });
  if (buf.byteLength > (type.startsWith("video") ? MAX_VIDEO : MAX_IMAGE)) return NextResponse.json({ error: "size" }, { status: 400 });

  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4" }[type];
  const blob = await put(`${purpose}/${u.id.slice(-6)}-${Date.now()}.${ext}`, Buffer.from(buf), { access: "public", contentType: type, addRandomSuffix: true });
  return NextResponse.json({ url: blob.url });
}
