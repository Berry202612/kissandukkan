import Link from "next/link";
import { fontVars } from "./fonts";
import "./globals.css";

/** Fallback for paths outside the locale tree. */
export default function RootNotFound() {
  return (
    <html lang="en" className={fontVars}>
      <body className="flex min-h-screen items-center justify-center bg-cream font-sans">
        <div className="max-w-md p-6 text-center">
          <p className="font-heading text-5xl font-bold text-primary">404</p>
          <h1 className="mt-2 font-heading text-2xl font-bold">This page has wandered off the field</h1>
          <p className="mt-1 text-muted">यह पेज खेत से भटक गया है</p>
          <Link href="/en" className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary px-6 font-semibold text-white">
            Go to home page
          </Link>
        </div>
      </body>
    </html>
  );
}
