import { Link } from "wouter";

function ShopQuoteWordmark() {
  return (
    <div className="flex items-center gap-3">
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="26" height="26" rx="2" fill="none" stroke="#FF6B00" strokeWidth="1.5"/>
        <line x1="14" y1="4" x2="14" y2="9" stroke="#FF6B00" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="14" y1="19" x2="14" y2="24" stroke="#FF6B00" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="4" y1="14" x2="9" y2="14" stroke="#FF6B00" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="19" y1="14" x2="24" y2="14" stroke="#FF6B00" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="14" cy="14" r="3.5" fill="none" stroke="#FF6B00" strokeWidth="1.5"/>
        <circle cx="14" cy="14" r="1" fill="#FF6B00"/>
      </svg>
      <div>
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase leading-none" style={{ color: "rgba(255,255,255,0.9)" }}>SHOP</div>
        <div className="text-[10px] font-semibold tracking-[0.22em] uppercase leading-none mt-0.5" style={{ color: "#FF6B00" }}>QUOTE</div>
      </div>
    </div>
  );
}

export function PricingPage() {
  return (
    <div style={{ background: "#0A0A0C", color: "#E8E9EA", minHeight: "100vh", fontFamily: "'Inter', 'IBM Plex Sans', system-ui, sans-serif" }}>
      <header className="flex items-center justify-between" style={{ padding: "0 3rem", height: "64px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/"><ShopQuoteWordmark /></Link>
        <Link href="/dashboard">
          <button
            className="text-sm font-semibold"
            style={{ padding: "8px 20px", border: "1px solid rgba(255,107,0,0.4)", color: "#FF6B00", background: "transparent", cursor: "pointer", letterSpacing: "0.06em" }}
          >
            DASHBOARD
          </button>
        </Link>
      </header>

      <main style={{ padding: "100px 3rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#FF6B00", letterSpacing: "0.2em" }}>PRICING</div>
            <h1 className="font-bold mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", letterSpacing: "-0.02em", color: "#fff" }}>
              Straightforward. Honest.
            </h1>
            <p style={{ color: "rgba(255,255,255,0.4)", maxWidth: "440px", margin: "0 auto", lineHeight: 1.7 }}>
              Built for small machine shops, not enterprise ERP complexity. No per-user charges. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-px" style={{ background: "rgba(255,107,0,0.1)", border: "1px solid rgba(255,107,0,0.1)" }}>
            {/* Monthly */}
            <div style={{ background: "#0A0A0C", padding: "48px 40px" }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em" }}>MONTHLY PLAN</div>
              <div className="mb-1">
                <span className="font-bold" style={{ fontSize: "3rem", color: "#fff", letterSpacing: "-0.03em" }}>£92.50</span>
              </div>
              <div className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.3)" }}>per month, cancel anytime</div>
              <div className="space-y-4 mb-10">
                {[
                  "Unlimited quotes",
                  "Unlimited customers",
                  "Unlimited machines",
                  "PDF exports",
                  "Email support",
                ].map(f => (
                  <div key={f} className="flex items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                    <span style={{ color: "#FF6B00" }}>—</span>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/dashboard">
                <button
                  className="w-full py-3.5 text-sm font-semibold uppercase tracking-wider transition-colors"
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", cursor: "pointer", letterSpacing: "0.1em" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.35)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)")}
                >
                  START MONTHLY
                </button>
              </Link>
            </div>

            {/* Lifetime */}
            <div style={{ background: "rgba(255,107,0,0.05)", padding: "48px 40px" }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#FF6B00", letterSpacing: "0.2em" }}>★ RECOMMENDED</div>
              <div className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: "rgba(255,107,0,0.7)", letterSpacing: "0.2em" }}>FOUNDER LIFETIME</div>
              <div className="mb-1">
                <span className="font-bold" style={{ fontSize: "3rem", color: "#fff", letterSpacing: "-0.03em" }}>£999</span>
              </div>
              <div className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.3)" }}>one-off payment, yours forever</div>
              <div className="space-y-4 mb-10">
                {[
                  "All monthly features",
                  "Pay once, use forever",
                  "Priority support",
                  "All future updates included",
                  "Early access to new features",
                ].map(f => (
                  <div key={f} className="flex items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                    <span style={{ color: "#FF6B00" }}>—</span>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/dashboard">
                <button
                  className="w-full py-3.5 text-sm font-bold uppercase tracking-wider transition-colors"
                  style={{ background: "#FF6B00", border: "none", color: "#fff", cursor: "pointer", letterSpacing: "0.1em" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#e55f00")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#FF6B00")}
                >
                  BUY LIFETIME ACCESS
                </button>
              </Link>
            </div>
          </div>

          <p className="mt-8 text-xs text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
            No hidden fees. No per-user charges. No ERP complexity.
          </p>

          {/* FAQ / Trust */}
          <div className="mt-20 grid md:grid-cols-3 gap-px" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}>
            {[
              { q: "Who is this for?", a: "Small CNC machine shops with 1–20 people who quote milling and turning work regularly." },
              { q: "What if I need help?", a: "Email support is included on all plans. Lifetime access includes priority support." },
              { q: "Can I cancel?", a: "Monthly plan cancels anytime. Lifetime is a one-off purchase — no subscriptions, no surprises." },
            ].map(({ q, a }) => (
              <div key={q} style={{ background: "#0A0A0C", padding: "32px 28px" }}>
                <div className="font-semibold mb-3" style={{ color: "#fff", fontSize: "0.9rem" }}>{q}</div>
                <div className="text-sm" style={{ color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "32px 3rem" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>© {new Date().getFullYear()} SHOP Quote</span>
          <Link href="/"><span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>← Back to home</span></Link>
        </div>
      </footer>
    </div>
  );
}
