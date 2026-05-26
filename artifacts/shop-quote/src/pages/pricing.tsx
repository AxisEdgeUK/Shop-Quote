import { Link } from "wouter";

const BLUE = "#1D8FFF";
const BLUE_GLOW = "rgba(29,143,255,0.12)";

function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="26" height="26" rx="2" fill="none" stroke={BLUE} strokeWidth="1.5" />
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
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "#111827", lineHeight: 1 }}>SHOP</div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", color: BLUE, lineHeight: 1, marginTop: 2 }}>QUOTE</div>
      </div>
    </div>
  );
}

const CHECK = (
  <span style={{ color: BLUE, fontWeight: 700, marginRight: 8, fontSize: 13 }}>✓</span>
);

export function PricingPage() {
  return (
    <div style={{ background: "#ffffff", color: "#111827", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 3rem", height: 64, borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
        <Link href="/"><Wordmark /></Link>
        <Link href="/dashboard">
          <button
            style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", border: `1px solid ${BLUE}`, color: BLUE, background: "transparent", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = BLUE_GLOW)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            DASHBOARD
          </button>
        </Link>
      </header>

      <main style={{ padding: "80px 3rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>

          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-block", padding: "4px 14px", border: `1px solid ${BLUE}`, background: BLUE_GLOW, borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: BLUE, textTransform: "uppercase", marginBottom: 20 }}>
              Beta Founder Pricing
            </div>
            <h1 style={{ fontWeight: 800, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", letterSpacing: "-0.025em", color: "#111827", marginBottom: 14, lineHeight: 1.15 }}>
              Own it. Don't rent it.
            </h1>
            <p style={{ color: "#6b7280", maxWidth: 420, margin: "0 auto", lineHeight: 1.75, fontSize: "0.9rem" }}>
              Early-access pricing for the first cohort of machine shops. This is not the permanent price.
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

            {/* Monthly Founder */}
            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", padding: "40px 36px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "#9ca3af", textTransform: "uppercase", marginBottom: 20 }}>
                Pay Monthly Founder
              </div>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: "2.8rem", color: "#111827", letterSpacing: "-0.03em" }}>£50</span>
                <span style={{ fontSize: 14, color: "#6b7280", marginLeft: 6 }}>/month</span>
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>
                for 12 months · then lifetime access
              </div>
              <div style={{ fontSize: 12, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 3, padding: "8px 12px", marginBottom: 32, lineHeight: 1.5 }}>
                After 12 payments, the licence is owned. No further charges.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
                {[
                  "Unlimited quotes",
                  "Unlimited customers",
                  "Unlimited machines",
                  "PDF exports",
                  "Email support",
                  "All future updates",
                ].map((f) => (
                  <div key={f} style={{ fontSize: 13, color: "#374151", display: "flex", alignItems: "center" }}>
                    {CHECK}{f}
                  </div>
                ))}
              </div>
              <Link href="/dashboard">
                <button
                  style={{ width: "100%", padding: "13px 0", fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", background: "transparent", border: "1px solid #d1d5db", color: "#6b7280", cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.color = BLUE; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#6b7280"; }}
                >
                  Start Monthly
                </button>
              </Link>
            </div>

            {/* Beta Founder Lifetime — featured */}
            <div style={{ background: "#ffffff", border: `2px solid ${BLUE}`, padding: "40px 36px", boxShadow: `0 6px 28px ${BLUE_GLOW}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: BLUE, textTransform: "uppercase" }}>
                  Beta Founder Licence
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "#ffffff", background: BLUE, padding: "3px 8px", borderRadius: 2, textTransform: "uppercase" }}>
                  Best Value
                </div>
              </div>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: "2.8rem", color: "#111827", letterSpacing: "-0.03em" }}>£499</span>
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>
                one-off payment · yours forever
              </div>
              <div style={{ fontSize: 12, color: BLUE, background: BLUE_GLOW, border: `1px solid rgba(29,143,255,0.2)`, borderRadius: 3, padding: "8px 12px", marginBottom: 32, lineHeight: 1.5, fontWeight: 500 }}>
                Early-access pricing. This will not be the launch price.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
                {[
                  "Everything in Monthly",
                  "Pay once · never pay again",
                  "Priority support",
                  "All future updates included",
                  "Founder recognition",
                  "Direct line to the roadmap",
                ].map((f) => (
                  <div key={f} style={{ fontSize: 13, color: "#374151", display: "flex", alignItems: "center" }}>
                    {CHECK}{f}
                  </div>
                ))}
              </div>
              <Link href="/dashboard">
                <button
                  style={{ width: "100%", padding: "13px 0", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: BLUE, color: "#fff", border: "none", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#0A78E8")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = BLUE)}
                >
                  Buy Founder Access — £499
                </button>
              </Link>
            </div>
          </div>

          {/* Early-access note */}
          <div style={{ marginTop: 20, padding: "14px 20px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 3, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>⚠</span>
            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: "#374151" }}>This is beta founder pricing.</strong> Prices will increase at general release. Founding members keep their original licence terms permanently.
            </p>
          </div>

          <p style={{ marginTop: 16, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
            No hidden fees. No per-user charges. No ERP complexity.
          </p>

          {/* FAQ */}
          <div style={{ marginTop: 72, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {[
              { q: "Who is this for?", a: "Small CNC machine shops with 1–20 people who quote milling and turning work regularly." },
              { q: "Is this really the final price?", a: "No. Beta founder pricing will not be available after general release. Early adopters lock in their rate permanently." },
              { q: "What happens after 12 payments?", a: "The monthly licence converts to lifetime access automatically. No further charges, ever." },
            ].map(({ q, a }) => (
              <div key={q} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", padding: "28px 24px" }}>
                <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.875rem", marginBottom: 10 }}>{q}</div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280", lineHeight: 1.75 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #e5e7eb", padding: "32px 3rem", background: "#f9fafb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>© {new Date().getFullYear()} SHOP Quote — Beta v0.1</span>
          <Link href="/"><span style={{ fontSize: 12, color: "#6b7280" }}>← Back to home</span></Link>
        </div>
      </footer>
    </div>
  );
}
