import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

const BLUE = "#1D8FFF";
const BLUE_DIM = "rgba(29,143,255,0.7)";
const BLUE_GLOW = "rgba(29,143,255,0.15)";

const HERO_VIDEO = "/hero.mp4";

function LogoMark({ size = 26, color = BLUE }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="26" height="26" rx="2" fill="none" stroke={color} strokeWidth="1.5" />
      <line x1="14" y1="4" x2="14" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="19" x2="14" y2="24" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="14" x2="9" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="14" x2="24" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="3.5" fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="14" cy="14" r="1" fill={color} />
    </svg>
  );
}

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={26} color={BLUE} />
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: light ? "rgba(255,255,255,0.9)" : "#0D1117", lineHeight: 1 }}>
          SHOP
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", color: BLUE, lineHeight: 1, marginTop: 2 }}>
          QUOTE
        </div>
      </div>
    </div>
  );
}

function HeroBackground({ src }: { src: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      {/* Dark vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(5,10,20,0.65) 0%, rgba(5,10,20,0.40) 50%, rgba(5,10,20,0.65) 100%)",
        }}
      />
    </div>
  );
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div style={{ background: "#ffffff", color: "#111827", fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>

      {/* ── KEYFRAMES injected via style tag (non-React, safe) ── */}
      <style>{`
        @keyframes kenBurnsL {
          from { transform: scale(1.0) translate(0%, 0%); }
          to   { transform: scale(1.10) translate(-2.5%, -1.5%); }
        }
        @keyframes kenBurnsR {
          from { transform: scale(1.0) translate(0%, 0%); }
          to   { transform: scale(1.10) translate(2.5%, 1.5%); }
        }
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: 64,
          padding: "0 3rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background 0.3s, border-color 0.3s, box-shadow 0.3s",
          background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled ? "1px solid #e5e7eb" : "1px solid transparent",
          boxShadow: scrolled ? "0 1px 12px rgba(0,0,0,0.06)" : "none",
        }}
      >
        <Wordmark light />
        <nav style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {[
            { label: "Features", href: "#features" },
            { label: "Pricing", href: "/pricing" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.75)", letterSpacing: "0.04em", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = "#fff")}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.75)")}
            >
              {label}
            </a>
          ))}
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
              onMouseEnter={e => ((e.currentTarget).style.background = BLUE_GLOW)}
              onMouseLeave={e => ((e.currentTarget).style.background = "transparent")}
            >
              LOGIN
            </button>
          </Link>
        </nav>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
        {/* Full-width background */}
        <HeroBackground src={HERO_VIDEO} />

        {/* Centre headline overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 1.5rem",
            pointerEvents: "none",
            animation: "heroFadeUp 0.9s ease-out both",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.28em", color: BLUE, textTransform: "uppercase", marginBottom: 24 }}>
            SHOP QUOTE — CNC ESTIMATING SOFTWARE
          </div>

          <h1
            style={{
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
              color: "#FFFFFF",
              textShadow: "0 2px 60px rgba(0,0,0,0.9)",
              maxWidth: 820,
              marginBottom: 24,
              fontSize: "clamp(2.4rem, 5.5vw, 5rem)",
            }}
          >
            FAST PRECISE QUOTING<br />
            <span style={{ color: BLUE }}>FOR SMALL CNC SHOPS</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(0.95rem, 1.4vw, 1.1rem)",
              color: "rgba(255,255,255,0.6)",
              maxWidth: 500,
              lineHeight: 1.75,
              marginBottom: 40,
              textShadow: "0 1px 20px rgba(0,0,0,0.95)",
            }}
          >
            Create professional milling and turning quotes without relying on spreadsheets,
            memory, or a full-time estimator.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", pointerEvents: "auto" }}>
            <Link href="/dashboard">
              <button
                style={{
                  padding: "14px 36px",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: BLUE,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => ((e.currentTarget).style.background = "#0A78E8")}
                onMouseLeave={e => ((e.currentTarget).style.background = BLUE)}
              >
                START QUOTING FASTER
              </button>
            </Link>
            <a
              href="#features"
              style={{
                padding: "13px 32px",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.06em",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "rgba(255,255,255,0.85)",
                textDecoration: "none",
                display: "inline-block",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.22)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; }}
            >
              VIEW FEATURES
            </a>
          </div>
        </div>

        {/* Bottom gradient fade to page bg */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 140, zIndex: 25, background: "linear-gradient(to bottom, transparent, #ffffff)" }} />

        {/* Scroll cue */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 35, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.25)", animation: "heroFadeUp 1.2s 0.6s ease-out both", opacity: 0 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase" }}>Scroll</span>
          <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
            <path d="M7 0v14M1 8l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── FEATURE STRIP ─────────────────────────────────────────── */}
      <section id="features" ref={featuresRef} style={{ padding: "100px 3rem 80px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: BLUE, textTransform: "uppercase", marginBottom: 16 }}>
              BUILT FOR THE WORKSHOP
            </div>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(1.8rem, 3vw, 2.8rem)", letterSpacing: "-0.025em", color: "#111827", marginBottom: 16 }}>
              Engineered for small machine shops
            </h2>
            <p style={{ color: "#6b7280", maxWidth: 480, margin: "0 auto", lineHeight: 1.75, fontSize: "0.95rem" }}>
              Purpose-built estimating software that works the way your shop works — not enterprise ERP complexity.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { icon: <TargetIcon />, title: "Faster Quoting", body: "Go from enquiry to professional quote in minutes — not hours. Preloaded assumptions reduce manual input." },
              { icon: <CalcIcon />,   title: "Structured Estimating", body: "Setup, machining, material, risk, and margin — every cost accounted for, every time. No more forgotten costs." },
              { icon: <ChipIcon />,   title: "Reduce Owner Workload", body: "Delegate quoting with confidence. New staff can quote accurately using your established rates and assumptions." },
              { icon: <DocIcon />,    title: "Professional PDFs", body: "Clean quote documents that reflect the quality of your shop — not a spreadsheet printout." },
              { icon: <ShopIcon />,   title: "Built for Small Shops", body: "No bloated features. No enterprise complexity. Designed for 1–20 person CNC machine shops." },
              { icon: <SpeedIcon />,  title: "Quantity Price Breaks", body: "Automatically calculate pricing for 5, 10, 25, 50 off — showing true volume economics." },
            ].map((f, i) => (
              <div
                key={i}
                style={{ background: "#f9fafb", border: "1px solid #e5e7eb", padding: "36px 32px", transition: "border-color 0.15s, box-shadow 0.15s", cursor: "default" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = BLUE; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${BLUE}20`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                <div style={{ color: BLUE, marginBottom: 20 }}>{f.icon}</div>
                <div style={{ fontWeight: 600, color: "#111827", marginBottom: 10, letterSpacing: "-0.01em" }}>{f.title}</div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.75 }}>{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COST BREAKDOWN ───────────────────────────────────────── */}
      <section style={{ padding: "80px 3rem", background: "#f9fafb", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: BLUE, textTransform: "uppercase", marginBottom: 20 }}>COST ENGINE</div>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(1.6rem, 2.5vw, 2.4rem)", letterSpacing: "-0.025em", color: "#111827", marginBottom: 20 }}>
              Every cost. Visible.<br />Every time.
            </h2>
            <p style={{ color: "#6b7280", lineHeight: 1.85, marginBottom: 32, fontSize: "0.95rem" }}>
              Small shops hate black boxes. Every calculation is transparent — setup, machining,
              material, risk, and your margin are shown clearly before you commit to a price.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Setup & programming amortised over quantity",
                "Material with configurable wastage %",
                "Risk percentage per part",
                "Margin applied correctly (not markup)",
                "VAT calculated and shown separately",
              ].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: BLUE, marginTop: 8, flexShrink: 0 }} />
                  <span style={{ color: "#374151", fontSize: "0.9rem" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <CostBreakdownPanel />
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section style={{ padding: "100px 3rem", background: "#ffffff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: BLUE, textTransform: "uppercase", marginBottom: 16 }}>PRICING</div>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(1.8rem, 3vw, 2.8rem)", letterSpacing: "-0.025em", color: "#111827", marginBottom: 16 }}>Straightforward. Honest.</h2>
          <p style={{ color: "#6b7280", maxWidth: 420, margin: "0 auto 60px", lineHeight: 1.75, fontSize: "0.9rem" }}>
            Built for small machine shops, not enterprise ERP complexity.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 720, margin: "0 auto" }}>
            <PricingCard label="MONTHLY" price="£92.50" period="per month" features={["Unlimited quotes", "Unlimited customers", "Unlimited machines", "PDF exports", "Email support"]} cta="Start Monthly" href="/dashboard" />
            <PricingCard label="FOUNDER LIFETIME" price="£999" period="one-off payment" features={["All monthly features", "Pay once, use forever", "Priority support", "All future updates"]} cta="Buy Lifetime Access" href="/dashboard" featured />
          </div>
          <p style={{ marginTop: 28, fontSize: 12, color: "#9ca3af" }}>No hidden fees. No per-user charges. No ERP complexity.</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid #e5e7eb", padding: "48px 3rem", background: "#f9fafb" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32 }}>
            <div>
              <Wordmark />
              <p style={{ marginTop: 12, fontSize: 12, color: "#9ca3af", maxWidth: 220, lineHeight: 1.6 }}>CNC estimating software for small machine shops.</p>
            </div>
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              {[{ label: "Dashboard", href: "/dashboard" }, { label: "Pricing", href: "/pricing" }].map(({ label, href }) => (
                <Link key={label} href={href}><span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span></Link>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af" }}>
            <span>© {new Date().getFullYear()} SHOP Quote</span>
            <span>Precision quoting for precision engineering</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CostBreakdownPanel() {
  const bars = [
    { label: "Setup & Programming", pct: 22, amt: "£220" },
    { label: "Machining Time",      pct: 38, amt: "£380" },
    { label: "Material",            pct: 18, amt: "£180" },
    { label: "Risk (10%)",          pct: 8,  amt: "£82" },
    { label: "Margin (30%)",        pct: 14, amt: "£205", accent: true },
  ];
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", color: "#9ca3af", textTransform: "uppercase", marginBottom: 24 }}>
        COST BREAKDOWN — ALUMINIUM BRACKET × 50
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {bars.map((b, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: "#6b7280" }}>{b.label}</span>
              <span style={{ fontFamily: "monospace", color: "#374151" }}>{b.amt}</span>
            </div>
            <div style={{ height: 3, background: "#f3f4f6", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${b.pct * 2.5}%`, background: b.accent ? BLUE : `rgba(29,143,255,0.35)`, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Sell Price</span>
          <span style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "1.6rem", color: BLUE }}>
            £22.34<span style={{ fontSize: 13, fontWeight: 400, color: "#9ca3af", marginLeft: 4 }}>/ part</span>
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>Margin 30% • VAT excl.</span>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "#9ca3af" }}>£1,117 total</span>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ label, price, period, features, cta, href, featured }: {
  label: string; price: string; period: string; features: string[];
  cta: string; href: string; featured?: boolean;
}) {
  return (
    <div style={{ background: "#ffffff", border: featured ? `2px solid ${BLUE}` : "1px solid #e5e7eb", padding: "40px 36px", boxShadow: featured ? `0 4px 24px rgba(29,143,255,0.12)` : "0 1px 8px rgba(0,0,0,0.04)" }}>
      {featured && (
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: BLUE, textTransform: "uppercase", marginBottom: 6 }}>★ RECOMMENDED</div>
      )}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: featured ? BLUE : "#9ca3af", textTransform: "uppercase", marginBottom: 20 }}>{label}</div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ fontWeight: 800, fontSize: "2.6rem", color: "#111827", letterSpacing: "-0.03em" }}>{price}</span>
      </div>
      <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 32 }}>{period}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
        {features.map(f => (
          <div key={f} style={{ fontSize: 13, color: "#374151" }}>
            {f}
          </div>
        ))}
      </div>
      <Link href={href}>
        <button
          style={featured ? {
            width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase",
            background: BLUE, color: "#fff", border: "none", cursor: "pointer", transition: "background 0.15s",
          } : {
            width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase",
            background: "transparent", color: "#6b7280", border: "1px solid #d1d5db", cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => { if (featured) (e.currentTarget).style.background = "#0A78E8"; else { (e.currentTarget).style.borderColor = BLUE; (e.currentTarget).style.color = BLUE; } }}
          onMouseLeave={e => { if (featured) (e.currentTarget).style.background = BLUE; else { (e.currentTarget).style.borderColor = "#d1d5db"; (e.currentTarget).style.color = "#6b7280"; } }}
        >
          {cta}
        </button>
      </Link>
    </div>
  );
}

function TargetIcon() { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="21"/><line x1="3" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="21" y2="12"/></svg>; }
function CalcIcon()   { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>; }
function ChipIcon()   { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="7" y="7" width="10" height="10" rx="1"/><line x1="7" y1="12" x2="3" y2="12"/><line x1="17" y1="12" x2="21" y2="12"/><line x1="12" y1="7" x2="12" y2="3"/><line x1="12" y1="17" x2="12" y2="21"/></svg>; }
function DocIcon()    { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>; }
function ShopIcon()   { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function SpeedIcon()  { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>; }
