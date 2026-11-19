"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FBF8F1", fontFamily: "system-ui, sans-serif", color: "#1C2420" }}>
        <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <p style={{ fontSize: 48, fontWeight: 700, color: "#1E6B3A", margin: 0 }}>500</p>
          <h1 style={{ fontSize: 22 }}>Something went wrong on our side</h1>
          <p style={{ color: "#6B7A70" }}>हमारी तरफ़ से कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।</p>
          <button onClick={reset} style={{ marginTop: 16, height: 48, padding: "0 24px", borderRadius: 12, border: 0, background: "#1E6B3A", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
