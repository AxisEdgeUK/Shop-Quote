import { Link } from "wouter";

const BLUE = "#1D8FFF";
const BLUE_GLOW = "rgba(29,143,255,0.12)";

function LogoMark() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="1"
        y="1"
        width="26"
        height="26"
        rx="2"
        fill="none"
        stroke={BLUE}
        strokeWidth="1.5"
      />
      <line x1="14" y1="4" x2="14" y2="9" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="19" x2="14" y2="24" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="14" x2="9" y2="14" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="14" x2="24" y2="14" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="3.5" fill="none" stroke={BLUE} strokeWidth="1.5" />
      <circle cx="14" cy="14" r="1" fill={BLUE} />
    </svg>
  );
}

function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <LogoMark />
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "#111827", lineHeight: 1 }}>
          SHOP
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", color: BLUE, lineHeight: 1, marginTop: 2 }}>
          QUOTE
        </div>
      </div>
    </div>
  );
}

export function PricingPage() {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#111827",
        minHeight: "100vh",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 3rem",
          height: 64,
          borderBottom: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
      >
        <Link href="/">
          <Wordmark />
        </Link>
        <Link href="/dashboard">
          <button
            style={{
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.06em",
              border: `1px solid ${BLUE}`,
              color: BLUE,
              background: "transparent",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = BLUE_GLOW)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            DASHBOARD
          </button>
        </Link>
      </header>

      <main style={{ padding: "80px 3rem" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div
              style={{
                display: "inline-block",
                padding: "4px 14px",
                border: `1px solid ${BLUE}`,
                background: BLUE_GLOW,
                borderRadius: 2,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: BLUE,
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Beta v0.1
            </div>
            <h1
              style={{
                fontWeight: 800,
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                letterSpacing: "-0.025em",
                color: "#111827",
                marginBottom: 14,
                lineHeight: 1.15,
              }}
            >
              Built for machine shops.
            </h1>
            <p
              style={{
                color: "#6b7280",
                maxWidth: 420,
                margin: "0 auto",
                lineHeight: 1.75,
                fontSize: "0.9rem",
              }}
            >
              SHOP Quote is currently in beta testing with a small group of CNC machine shops.
            </p>
          </div>

          {/* Beta notice */}
          <div
            style={{
              border: `1px solid ${BLUE}`,
              background: BLUE_GLOW,
              padding: "40px 44px",
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.22em",
                color: BLUE,
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Beta Testing
            </div>
            <p
              style={{
                fontSize: "1rem",
                color: "#374151",
                lineHeight: 1.75,
                maxWidth: 420,
                margin: "0 auto 20px",
              }}
            >
              Pricing will be announced at general launch. Beta participants are testing the product with real quotes before public release.
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6b7280",
                lineHeight: 1.75,
                maxWidth: 400,
                margin: "0 auto",
              }}
            >
              If you would like to join the early access programme, get in touch.
            </p>
          </div>

          <p style={{ marginTop: 16, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
            No hidden fees. No per-user charges. No ERP complexity.
          </p>

          {/* FAQ */}
          <div
            style={{
              marginTop: 72,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            {[
              {
                q: "Who is this for?",
                a: "Small CNC machine shops with 1–20 people who quote milling and turning work regularly.",
              },
              {
                q: "What does it include?",
                a: "Unlimited quotes, customers and machines. PDF exports, cost engine, delivery cost, price breaks, and customer history.",
              },
              {
                q: "Is it cloud-based?",
                a: "Yes. SHOP Quote runs in your browser. No installation. Access from any machine in the shop.",
              },
              {
                q: "Will my data be private?",
                a: "Yes. Your quote data is stored securely and is not shared with anyone outside your account.",
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  padding: "28px 24px",
                }}
              >
                <div
                  style={{ fontWeight: 600, color: "#111827", fontSize: "0.875rem", marginBottom: 10 }}
                >
                  {q}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280", lineHeight: 1.75 }}>
                  {a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer
        style={{
          borderTop: "1px solid #e5e7eb",
          padding: "32px 3rem",
          background: "#f9fafb",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            © {new Date().getFullYear()} SHOP Quote — Beta v0.1
          </span>
          <Link href="/">
            <span style={{ fontSize: 12, color: "#6b7280" }}>← Back to home</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
