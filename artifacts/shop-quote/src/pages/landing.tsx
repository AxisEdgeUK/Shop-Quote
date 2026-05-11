import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

const TURNING_VIDEO_ID = "X_IlbaH9Rvk";
const MILLING_VIDEO_ID = "uxeLHtD3_Qw";

function VideoBackground({ videoId, side }: { videoId: string; side: "left" | "right" }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&vq=hd1080&start=2`}
        allow="autoplay; fullscreen"
        title={side === "left" ? "CNC Turning" : "CNC Milling"}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "calc(100vh * 16 / 9)",
          minWidth: "100%",
          height: "100%",
          border: "none",
          pointerEvents: "none",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(10,10,12,0.55) 0%, rgba(10,10,12,0.45) 60%, rgba(10,10,12,0.75) 100%)",
        }}
      />
    </div>
  );
}

function ShopQuoteWordmark({ dark = false }: { dark?: boolean }) {
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
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase leading-none"
          style={{ color: dark ? "#1A1B1E" : "rgba(255,255,255,0.9)" }}>SHOP</div>
        <div className="text-[10px] font-semibold tracking-[0.22em] uppercase leading-none mt-0.5"
          style={{ color: "#FF6B00" }}>QUOTE</div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: "#0A0A0C", color: "#E8E9EA", fontFamily: "'Inter', 'IBM Plex Sans', system-ui, sans-serif" }}>

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between transition-all duration-300"
        style={{
          padding: "0 3rem",
          height: "64px",
          background: scrolled ? "rgba(10,10,12,0.9)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,107,0,0.12)" : "none",
        }}
      >
        <ShopQuoteWordmark />
        <nav className="hidden md:flex items-center gap-8">
          {["Features", "Pricing"].map(label => (
            <a
              key={label}
              href={label === "Pricing" ? "/pricing" : "#features"}
              className="text-sm font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.65)", letterSpacing: "0.04em" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
            >
              {label}
            </a>
          ))}
          <Link href="/dashboard">
            <button
              className="text-sm font-semibold transition-all"
              style={{
                padding: "8px 20px",
                border: "1px solid rgba(255,107,0,0.5)",
                color: "#FF6B00",
                background: "transparent",
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,107,0,0.1)";
                (e.currentTarget as HTMLElement).style.borderColor = "#FF6B00";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,107,0,0.5)";
              }}
            >
              LOGIN
            </button>
          </Link>
        </nav>
      </header>

      {/* ── HERO: SPLIT VIDEO ─────────────────────────────────────── */}
      <section className="relative" style={{ height: "100vh", overflow: "hidden" }}>
        {/* Split background videos */}
        <div className="absolute inset-0 flex">
          {/* Left: CNC Turning */}
          <div className="relative overflow-hidden" style={{ width: "50%" }}>
            <VideoBackground videoId={TURNING_VIDEO_ID} side="left" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 70%, rgba(10,10,12,0.6) 100%)" }} />
            {/* Label */}
            <div className="absolute bottom-12 left-10 z-10">
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,107,0,0.85)", letterSpacing: "0.2em" }}>
                CNC TURNING
              </div>
              <div className="w-8 h-px" style={{ background: "#FF6B00" }} />
            </div>
          </div>

          {/* Divider */}
          <div className="absolute top-0 bottom-0 z-20" style={{ left: "50%", width: "1px", background: "linear-gradient(to bottom, transparent 0%, rgba(255,107,0,0.6) 20%, rgba(255,107,0,0.6) 80%, transparent 100%)" }} />

          {/* Right: CNC Milling */}
          <div className="relative overflow-hidden" style={{ width: "50%" }}>
            <VideoBackground videoId={MILLING_VIDEO_ID} side="right" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to left, transparent 70%, rgba(10,10,12,0.6) 100%)" }} />
            {/* Label */}
            <div className="absolute bottom-12 right-10 z-10 text-right">
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,107,0,0.85)", letterSpacing: "0.2em" }}>
                CNC MILLING
              </div>
              <div className="w-8 h-px ml-auto" style={{ background: "#FF6B00" }} />
            </div>
          </div>
        </div>

        {/* Center content overlay */}
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-6" style={{ pointerEvents: "none" }}>
          <div style={{ animation: "fadeInUp 0.9s ease-out both" }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-8" style={{ color: "#FF6B00", letterSpacing: "0.25em" }}>
              SHOP QUOTE — CNC ESTIMATING SOFTWARE
            </div>
            <h1
              className="font-bold leading-none mb-6"
              style={{
                fontSize: "clamp(2.2rem, 5vw, 4.5rem)",
                letterSpacing: "-0.02em",
                color: "#fff",
                textShadow: "0 2px 40px rgba(0,0,0,0.8)",
                maxWidth: "820px",
              }}
            >
              FAST PRACTICAL QUOTING<br />
              <span style={{ color: "#FF6B00" }}>FOR SMALL CNC SHOPS</span>
            </h1>
            <p
              className="mx-auto mb-10"
              style={{
                fontSize: "clamp(0.95rem, 1.5vw, 1.15rem)",
                color: "rgba(255,255,255,0.65)",
                maxWidth: "540px",
                lineHeight: 1.7,
                textShadow: "0 1px 20px rgba(0,0,0,0.9)",
              }}
            >
              Create professional milling and turning quotes without relying on spreadsheets, memory, or a full-time estimator.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap" style={{ pointerEvents: "auto" }}>
              <Link href="/dashboard">
                <button
                  className="font-bold uppercase transition-all"
                  style={{
                    padding: "14px 36px",
                    background: "#FF6B00",
                    color: "#fff",
                    letterSpacing: "0.1em",
                    fontSize: "0.875rem",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#e55f00")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#FF6B00")}
                >
                  START QUOTING FASTER
                </button>
              </Link>
              <a
                href="#features"
                className="font-medium transition-all"
                style={{
                  padding: "13px 32px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "rgba(255,255,255,0.85)",
                  letterSpacing: "0.06em",
                  fontSize: "0.875rem",
                  textDecoration: "none",
                  display: "inline-block",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.6)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; }}
              >
                VIEW FEATURES
              </a>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-32" style={{ background: "linear-gradient(to bottom, transparent, #0A0A0C)" }} />

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 z-30" style={{ transform: "translateX(-50%)", animation: "fadeInUp 1.2s 0.6s ease-out both" }}>
          <div className="flex flex-col items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            <div className="text-xs uppercase tracking-widest" style={{ fontSize: "10px", letterSpacing: "0.2em" }}>Scroll</div>
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path d="M8 0v16M2 10l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </section>

      {/* ── FEATURE STRIP ─────────────────────────────────────────── */}
      <section id="features" ref={featuresRef} style={{ padding: "100px 3rem 80px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div className="text-center mb-20">
            <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#FF6B00", letterSpacing: "0.2em" }}>BUILT FOR THE WORKSHOP</div>
            <h2 className="font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", letterSpacing: "-0.02em", color: "#fff" }}>
              Engineered for small machine shops
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", maxWidth: "500px", margin: "0 auto", lineHeight: 1.7 }}>
              Purpose-built estimating software that works the way your shop works — not enterprise ERP complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: "rgba(255,107,0,0.08)", border: "1px solid rgba(255,107,0,0.08)" }}>
            {[
              {
                icon: <TargetIcon />,
                title: "Faster Quoting",
                body: "Go from enquiry to professional quote in minutes — not hours. Preloaded assumptions reduce manual input.",
              },
              {
                icon: <CalcIcon />,
                title: "Structured Estimating",
                body: "Setup, machining, material, risk, and margin — every cost accounted for, every time. No more forgotten costs.",
              },
              {
                icon: <ChipIcon />,
                title: "Reduce Owner Workload",
                body: "Delegate quoting with confidence. New staff can quote accurately using your established rates and assumptions.",
              },
              {
                icon: <DocIcon />,
                title: "Professional PDFs",
                body: "Clean, precision-engineered quote documents that reflect the quality of your shop — not a spreadsheet printout.",
              },
              {
                icon: <ShopIcon />,
                title: "Built for Small Shops",
                body: "No bloated features. No enterprise complexity. Designed specifically for 1–20 person CNC machine shops.",
              },
              {
                icon: <SpeedIcon />,
                title: "Quantity Price Breaks",
                body: "Automatically calculate and display alternative pricing for 5, 10, 25, 50 off — showing true volume economics.",
              },
            ].map((f, i) => (
              <FeatureCard key={i} icon={f.icon} title={f.title} body={f.body} />
            ))}
          </div>
        </div>
      </section>

      {/* ── COST BREAKDOWN SECTION ────────────────────────────────── */}
      <section style={{ padding: "80px 3rem", background: "#0D0E10" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#FF6B00", letterSpacing: "0.2em" }}>COST ENGINE</div>
              <h2 className="font-bold mb-6" style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.4rem)", letterSpacing: "-0.02em", color: "#fff" }}>
                Every cost. Visible.<br />Every time.
              </h2>
              <p className="mb-8" style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
                Small shops hate black boxes. Every calculation in SHOP Quote is transparent — setup, machining, material, risk, and your margin are shown clearly before you commit to a price.
              </p>
              <div className="space-y-3">
                {["Setup & programming amortised over quantity", "Material with configurable wastage %", "Risk percentage per part", "Margin applied correctly (not markup)", "VAT calculated and shown separately"].map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "#FF6B00" }} />
                    <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.9rem" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <CostBreakdownPanel />
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────── */}
      <section style={{ padding: "100px 3rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#FF6B00", letterSpacing: "0.2em" }}>PRICING</div>
          <h2 className="font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", letterSpacing: "-0.02em", color: "#fff" }}>
            Straightforward. Honest.
          </h2>
          <p className="mb-16" style={{ color: "rgba(255,255,255,0.45)", maxWidth: "440px", margin: "0 auto 4rem" }}>
            Built for small machine shops, not enterprise ERP complexity.
          </p>
          <div className="grid md:grid-cols-2 gap-px" style={{ background: "rgba(255,107,0,0.1)", border: "1px solid rgba(255,107,0,0.1)", maxWidth: "720px", margin: "0 auto" }}>
            <PricingCard
              label="MONTHLY"
              price="£92.50"
              period="per month"
              features={["Unlimited quotes", "Unlimited customers", "Unlimited machines", "PDF exports", "Email support"]}
              cta="Start Monthly"
              href="/dashboard"
            />
            <PricingCard
              label="FOUNDER LIFETIME"
              price="£999"
              period="one-off payment"
              features={["All monthly features", "Pay once, use forever", "Priority support", "All future updates"]}
              cta="Buy Lifetime Access"
              href="/dashboard"
              featured
            />
          </div>
          <p className="mt-8 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            No hidden fees. No per-user charges. No ERP complexity.
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 3rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <ShopQuoteWordmark />
              <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.3)", maxWidth: "240px", lineHeight: 1.6 }}>
                CNC estimating software. Built for small machine shops.
              </p>
            </div>
            <div className="flex items-center gap-8">
              {[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Pricing", href: "/pricing" },
              ].map(({ label, href }) => (
                <Link key={label} href={href}>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-10 pt-6 flex justify-between items-center text-xs"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}>
            <span>© {new Date().getFullYear()} SHOP Quote</span>
            <span>Precision quoting for precision engineering</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div
      className="p-8 transition-all"
      style={{ background: "#0A0A0C" }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#0E0F12")}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#0A0A0C")}
    >
      <div className="mb-5" style={{ color: "#FF6B00" }}>{icon}</div>
      <h3 className="font-semibold mb-3" style={{ color: "#fff", letterSpacing: "-0.01em" }}>{title}</h3>
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{body}</p>
    </div>
  );
}

function CostBreakdownPanel() {
  const bars = [
    { label: "Setup & Programming", value: 22, amount: "£220" },
    { label: "Machining Time", value: 38, amount: "£380" },
    { label: "Material", value: 18, amount: "£180" },
    { label: "Risk (10%)", value: 8, amount: "£82" },
    { label: "Margin (30%)", value: 14, amount: "£205" },
  ];
  return (
    <div style={{ background: "#0D0E10", border: "1px solid rgba(255,107,0,0.12)", padding: "28px" }}>
      <div className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em" }}>
        COST BREAKDOWN — ALUMINIUM BRACKET × 50
      </div>
      <div className="space-y-4">
        {bars.map((b, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: "rgba(255,255,255,0.55)" }}>{b.label}</span>
              <span className="font-mono" style={{ color: "rgba(255,255,255,0.7)" }}>{b.amount}</span>
            </div>
            <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "1px" }}>
              <div style={{ height: "100%", width: `${b.value * 2.5}%`, background: i === 4 ? "#FF6B00" : "rgba(255,107,0,0.45)", borderRadius: "1px" }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex justify-between items-baseline">
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>Sell Price</span>
          <span className="font-bold font-mono text-2xl" style={{ color: "#FF6B00" }}>£22.34<span className="text-sm font-normal ml-1" style={{ color: "rgba(255,255,255,0.35)" }}>/ part</span></span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Margin 30% • VAT excl.</span>
          <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>£1,117 total</span>
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
    <div style={{ background: featured ? "rgba(255,107,0,0.06)" : "#0A0A0C", padding: "40px 36px" }}>
      {featured && (
        <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#FF6B00", letterSpacing: "0.2em" }}>★ RECOMMENDED</div>
      )}
      <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: featured ? "#FF6B00" : "rgba(255,255,255,0.35)", letterSpacing: "0.18em" }}>{label}</div>
      <div className="mb-1">
        <span className="font-bold" style={{ fontSize: "2.6rem", color: "#fff", letterSpacing: "-0.03em" }}>{price}</span>
      </div>
      <div className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.35)" }}>{period}</div>
      <div className="space-y-3 mb-10">
        {features.map(f => (
          <div key={f} className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            <span style={{ color: "#FF6B00", marginTop: "2px" }}>—</span>
            {f}
          </div>
        ))}
      </div>
      <Link href={href}>
        <button
          className="w-full py-3 font-semibold text-sm uppercase tracking-wide transition-all"
          style={featured ? {
            background: "#FF6B00",
            color: "#fff",
            border: "none",
            letterSpacing: "0.08em",
            cursor: "pointer",
          } : {
            background: "transparent",
            color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.15)",
            letterSpacing: "0.08em",
            cursor: "pointer",
          }}
          onMouseEnter={e => {
            if (featured) (e.currentTarget as HTMLElement).style.background = "#e55f00";
            else (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.35)";
          }}
          onMouseLeave={e => {
            if (featured) (e.currentTarget as HTMLElement).style.background = "#FF6B00";
            else (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
          }}
        >
          {cta}
        </button>
      </Link>
    </div>
  );
}

function TargetIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="21"/><line x1="3" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="21" y2="12"/></svg>;
}
function CalcIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>;
}
function ChipIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="7" y="7" width="10" height="10" rx="1"/><line x1="7" y1="12" x2="3" y2="12"/><line x1="17" y1="12" x2="21" y2="12"/><line x1="12" y1="7" x2="12" y2="3"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="7" y1="9" x2="3" y2="9"/><line x1="7" y1="15" x2="3" y2="15"/><line x1="17" y1="9" x2="21" y2="9"/><line x1="17" y1="15" x2="21" y2="15"/></svg>;
}
function DocIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>;
}
function ShopIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function SpeedIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
}
