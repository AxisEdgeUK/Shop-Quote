import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

const BLUE = "#1D8FFF";
const BLUE_GLOW = "rgba(29,143,255,0.15)";

const HERO_VIDEO = "/hero.mp4";

function LogoMark({
  size = 26,
  color = BLUE,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
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
        stroke={color}
        strokeWidth="1.5"
      />
      <line
        x1="14"
        y1="4"
        x2="14"
        y2="9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="19"
        x2="14"
        y2="24"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="14"
        x2="9"
        y2="14"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="19"
        y1="14"
        x2="24"
        y2="14"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="14"
        cy="14"
        r="3.5"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
      <circle cx="14" cy="14" r="1" fill={color} />
    </svg>
  );
}

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={26} color={BLUE} />
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            color: light ? "rgba(255,255,255,0.9)" : "#0D1117",
            lineHeight: 1,
          }}
        >
          SHOP
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.22em",
            color: BLUE,
            lineHeight: 1,
            marginTop: 2,
          }}
        >
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
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(5,10,20,0.72) 0%, rgba(5,10,20,0.50) 50%, rgba(5,10,20,0.72) 100%)",
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
    <div
      style={{
        background: "#ffffff",
        color: "#111827",
        fontFamily: "'Inter', system-ui, sans-serif",
        minHeight: "100vh",
      }}
    >
      <style>{`
        video::-webkit-media-controls,
        video::-webkit-media-controls-enclosure,
        video::-webkit-media-controls-panel,
        video::-webkit-media-controls-play-button,
        video::-webkit-media-controls-start-playback-button {
          display: none !important;
          -webkit-appearance: none;
        }
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .landing-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .landing-cost-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        .landing-pricing-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          max-width: 720px;
          margin: 0 auto;
        }
        .landing-header-nav {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .landing-header-links {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .landing-footer-inner {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 32px;
        }
        .landing-footer-links {
          display: flex;
          gap: 32px;
          align-items: center;
        }
        @media (max-width: 768px) {
          .landing-features-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .landing-cost-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .landing-pricing-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .landing-header-links {
            display: none;
          }
          .landing-footer-inner {
            flex-direction: column;
            gap: 20px;
          }
          .landing-footer-links {
            flex-direction: row;
            gap: 20px;
          }
          .landing-section-pad {
            padding-left: 1.25rem !important;
            padding-right: 1.25rem !important;
          }
          .landing-hero-eyebrow {
            font-size: 9px !important;
            letter-spacing: 0.18em !important;
          }
        }
        @media (max-width: 480px) {
          .landing-pricing-card-inner {
            padding: 28px 22px !important;
          }
          .landing-feature-card-inner {
            padding: 24px 20px !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: 64,
          padding: "0 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background 0.3s, border-color 0.3s, box-shadow 0.3s",
          background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled
            ? "1px solid #e5e7eb"
            : "1px solid transparent",
          boxShadow: scrolled ? "0 1px 12px rgba(0,0,0,0.06)" : "none",
        }}
      >
        <Wordmark light={!scrolled} />
        <nav className="landing-header-nav">
          <div className="landing-header-links">
            {[
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "/pricing" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: scrolled ? "#374151" : "rgba(255,255,255,0.75)",
                  letterSpacing: "0.04em",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {label}
              </a>
            ))}
          </div>
          <Link href="/dashboard">
            <button
              style={{
                padding: "9px 22px",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.06em",
                border: `1px solid ${BLUE}`,
                color: BLUE,
                background: "transparent",
                cursor: "pointer",
                transition: "background 0.15s",
                minHeight: 44,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = BLUE_GLOW)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              LOGIN
            </button>
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <section
        style={{
          position: "relative",
          height: "100svh",
          minHeight: 480,
          overflow: "hidden",
        }}
      >
        <HeroBackground src={HERO_VIDEO} />

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
            padding: "0 1.25rem",
            pointerEvents: "none",
            animation: "heroFadeUp 0.9s ease-out both",
          }}
        >
          <div
            className="landing-hero-eyebrow"
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.28em",
              color: BLUE,
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            CNC ESTIMATING SOFTWARE FOR MACHINE SHOPS
          </div>

          <h1
            style={{
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
              color: "#FFFFFF",
              textShadow: "0 2px 60px rgba(0,0,0,0.9)",
              maxWidth: 820,
              marginBottom: 20,
              fontSize: "clamp(2rem, 6vw, 5rem)",
            }}
          >
            FAST PRECISE QUOTING
            <br />
            <span style={{ color: BLUE }}>FOR SMALL CNC SHOPS</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(0.875rem, 1.8vw, 1.05rem)",
              color: "rgba(255,255,255,0.65)",
              maxWidth: 460,
              lineHeight: 1.7,
              marginBottom: 36,
              textShadow: "0 1px 20px rgba(0,0,0,0.95)",
              padding: "0 0.5rem",
            }}
          >
            Professional milling and turning quotes in minutes. No spreadsheets,
            no guesswork.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              pointerEvents: "auto",
              padding: "0 1rem",
            }}
          >
            <Link href="/dashboard">
              <button
                style={{
                  padding: "15px 32px",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: BLUE,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  minHeight: 52,
                  minWidth: 200,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#0A78E8")
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = BLUE)}
              >
                START QUOTING FASTER
              </button>
            </Link>
            <a
              href="#features"
              style={{
                padding: "14px 28px",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.06em",
                border: "1px solid rgba(255,255,255,0.28)",
                color: "rgba(255,255,255,0.85)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                transition: "border-color 0.15s, color 0.15s",
                minHeight: 52,
              }}
            >
              VIEW FEATURES
            </a>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 120,
            zIndex: 25,
            background: "linear-gradient(to bottom, transparent, #0D1117)",
          }}
        />
      </section>

      {/* FEATURE STRIP */}
      <section
        id="features"
        ref={featuresRef}
        className="landing-section-pad"
        style={{ padding: "80px 3rem 64px", background: "#0D1117" }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.22em",
                color: BLUE,
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              BUILT FOR THE WORKSHOP
            </div>
            <h2
              style={{
                fontWeight: 800,
                fontSize: "clamp(1.6rem, 3vw, 2.6rem)",
                letterSpacing: "-0.025em",
                color: "#E6EDF3",
                marginBottom: 14,
              }}
            >
              Engineered for small machine shops
            </h2>
            <p
              style={{
                color: "#8B949E",
                maxWidth: 460,
                margin: "0 auto",
                lineHeight: 1.75,
                fontSize: "0.9rem",
              }}
            >
              Purpose-built estimating that works the way your shop works. No
              ERP complexity.
            </p>
          </div>

          <div className="landing-features-grid">
            {[
              {
                icon: <TargetIcon />,
                title: "Faster Quoting",
                body: "Go from enquiry to professional quote in minutes. Preloaded assumptions reduce manual input.",
              },
              {
                icon: <CalcIcon />,
                title: "Structured Estimating",
                body: "Setup, machining, material, risk, and margin. Every cost accounted for, every time.",
              },
              {
                icon: <ChipIcon />,
                title: "Reduce Owner Workload",
                body: "Delegate quoting with confidence. New staff can quote accurately using your established rates.",
              },
              {
                icon: <DocIcon />,
                title: "Professional PDFs",
                body: "Clean quote documents that reflect your shop's quality. Not a spreadsheet printout.",
              },
              {
                icon: <ShopIcon />,
                title: "Built for Small Shops",
                body: "No bloated features. Designed for 1 to 20 person CNC machine shops.",
              },
              {
                icon: <SpeedIcon />,
                title: "Quantity Price Breaks",
                body: "Automatically calculate pricing for 5, 10, 25, and 50 off. Shows true volume economics.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="landing-feature-card-inner"
                style={{
                  background: "#111820",
                  border: "1px solid #21262D",
                  padding: "32px 28px",
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ color: BLUE, marginBottom: 16 }}>{f.icon}</div>
                <div
                  style={{
                    fontWeight: 600,
                    color: "#E6EDF3",
                    marginBottom: 8,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {f.title}
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#8B949E",
                    lineHeight: 1.75,
                  }}
                >
                  {f.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COST BREAKDOWN */}
      <section
        className="landing-section-pad"
        style={{
          padding: "72px 3rem",
          background: "#0D1117",
          borderTop: "1px solid #21262D",
          borderBottom: "1px solid #21262D",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="landing-cost-grid">
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  color: BLUE,
                  textTransform: "uppercase",
                  marginBottom: 18,
                }}
              >
                COST ENGINE
              </div>
              <h2
                style={{
                  fontWeight: 800,
                  fontSize: "clamp(1.5rem, 2.5vw, 2.3rem)",
                  letterSpacing: "-0.025em",
                  color: "#E6EDF3",
                  marginBottom: 18,
                }}
              >
                Every cost. Visible.
                <br />
                Every time.
              </h2>
              <p
                style={{
                  color: "#8B949E",
                  lineHeight: 1.85,
                  marginBottom: 28,
                  fontSize: "0.9rem",
                }}
              >
                Every calculation is transparent: setup, machining, material,
                risk, and your margin are shown clearly before you commit to a
                price.
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {[
                  "Setup and programming amortised over quantity",
                  "Material with configurable wastage percentage",
                  "Risk percentage applied per part",
                  "Margin applied correctly, not as markup",
                  "VAT calculated and shown separately",
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: BLUE,
                        marginTop: 8,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <CostBreakdownPanel />
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section
        className="landing-section-pad"
        style={{ padding: "88px 3rem", background: "#ffffff" }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.22em",
              color: BLUE,
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            PRICING
          </div>
          <h2
            style={{
              fontWeight: 800,
              fontSize: "clamp(1.6rem, 3vw, 2.6rem)",
              letterSpacing: "-0.025em",
              color: "#111827",
              marginBottom: 14,
            }}
          >
            Straightforward. Honest.
          </h2>
          <p
            style={{
              color: "#6b7280",
              maxWidth: 400,
              margin: "0 auto 52px",
              lineHeight: 1.75,
              fontSize: "0.875rem",
            }}
          >
            Built for small machine shops. No per-user charges. No hidden fees.
          </p>
          <div
            style={{
              maxWidth: 560,
              margin: "0 auto",
              border: "1px solid #21262D",
              padding: "48px 44px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.22em",
                color: "#58A6FF",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Beta Testing
            </div>
            <p
              style={{
                fontSize: "1rem",
                color: "#C9D1D9",
                lineHeight: 1.75,
                marginBottom: 12,
              }}
            >
              Pricing will be announced at general launch.
            </p>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", lineHeight: 1.75 }}>
              No hidden fees · No per-user charges · No ERP complexity.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="landing-section-pad"
        style={{
          borderTop: "1px solid #21262D",
          padding: "44px 3rem",
          background: "#0D1117",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="landing-footer-inner">
            <div>
              <Wordmark light />
              <p
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "#484F58",
                  maxWidth: 220,
                  lineHeight: 1.6,
                }}
              >
                CNC estimating software for small machine shops.
              </p>
            </div>
            <div className="landing-footer-links">
              {[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Pricing", href: "/pricing" },
              ].map(({ label, href }) => (
                <Link key={label} href={href}>
                  <span style={{ fontSize: 13, color: "#8B949E" }}>
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div
            style={{
              marginTop: 36,
              paddingTop: 20,
              borderTop: "1px solid #21262D",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#484F58",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
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
    { label: "Setup and Programming", pct: 22, amt: "£220" },
    { label: "Machining Time", pct: 38, amt: "£380" },
    { label: "Material", pct: 18, amt: "£180" },
    { label: "Risk (10%)", pct: 8, amt: "£82" },
    { label: "Margin (30%)", pct: 14, amt: "£205", accent: true },
  ];
  return (
    <div
      style={{
        background: "#111820",
        border: "1px solid #21262D",
        padding: 28,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.16em",
          color: "#484F58",
          textTransform: "uppercase",
          marginBottom: 24,
        }}
      >
        COST BREAKDOWN: ALUMINIUM BRACKET x 50
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {bars.map((b, i) => (
          <div key={i}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              <span style={{ color: "#8B949E" }}>{b.label}</span>
              <span style={{ fontFamily: "monospace", color: "#9ca3af" }}>
                {b.amt}
              </span>
            </div>
            <div style={{ height: 3, background: "#21262D", borderRadius: 2 }}>
              <div
                style={{
                  height: "100%",
                  width: `${b.pct * 2.5}%`,
                  background: b.accent ? BLUE : "rgba(29,143,255,0.4)",
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: "1px solid #21262D",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, color: "#8B949E" }}>Sell Price</span>
          <span
            style={{
              fontWeight: 700,
              fontFamily: "monospace",
              fontSize: "1.5rem",
              color: BLUE,
            }}
          >
            £22.34
            <span
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: "#484F58",
                marginLeft: 4,
              }}
            >
              per part
            </span>
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 11, color: "#484F58" }}>
            Margin 30% · VAT excl.
          </span>
          <span
            style={{ fontSize: 11, fontFamily: "monospace", color: "#484F58" }}
          >
            £1,117 total
          </span>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  label,
  price,
  period,
  features,
  cta,
  href,
  featured,
  contextNote,
}: {
  label: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  contextNote?: string;
}) {
  return (
    <div
      className="landing-pricing-card-inner"
      style={{
        background: "#ffffff",
        border: featured ? `2px solid ${BLUE}` : "1px solid #e5e7eb",
        padding: "36px 32px",
        boxShadow: featured
          ? "0 4px 24px rgba(29,143,255,0.12)"
          : "0 1px 8px rgba(0,0,0,0.04)",
      }}
    >
      {contextNote && (
        <p
          style={{
            fontSize: 11,
            color: "#9ca3af",
            letterSpacing: "0.01em",
            lineHeight: 1.5,
            margin: "0 0 20px",
            fontWeight: 400,
          }}
        >
          {contextNote}
        </p>
      )}
      {featured && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: BLUE,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          RECOMMENDED
        </div>
      )}
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.2em",
          color: featured ? BLUE : "#9ca3af",
          textTransform: "uppercase",
          marginBottom: 18,
        }}
      >
        {label}
      </div>
      <div style={{ marginBottom: 4 }}>
        <span
          style={{
            fontWeight: 800,
            fontSize: "2.4rem",
            color: "#111827",
            letterSpacing: "-0.03em",
          }}
        >
          {price}
        </span>
      </div>
      <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 28 }}>
        {period}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 32,
        }}
      >
        {features.map((f) => (
          <div
            key={f}
            style={{
              fontSize: 13,
              color: "#374151",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ color: BLUE, flexShrink: 0 }}>✓</span>
            {f}
          </div>
        ))}
      </div>
      <Link href={href}>
        <button
          style={
            featured
              ? {
                  width: "100%",
                  padding: "14px 0",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  background: BLUE,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  minHeight: 48,
                }
              : {
                  width: "100%",
                  padding: "14px 0",
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  background: "transparent",
                  color: "#6b7280",
                  border: "1px solid #d1d5db",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                  minHeight: 48,
                }
          }
        >
          {cta}
        </button>
      </Link>
    </div>
  );
}

function TargetIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="3" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="21" />
      <line x1="3" y1="12" x2="8" y2="12" />
      <line x1="16" y1="12" x2="21" y2="12" />
    </svg>
  );
}
function CalcIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}
function ChipIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <rect x="7" y="7" width="10" height="10" rx="1" />
      <line x1="9" y1="3" x2="9" y2="7" />
      <line x1="15" y1="3" x2="15" y2="7" />
      <line x1="9" y1="17" x2="9" y2="21" />
      <line x1="15" y1="17" x2="15" y2="21" />
      <line x1="3" y1="9" x2="7" y2="9" />
      <line x1="3" y1="15" x2="7" y2="15" />
      <line x1="17" y1="9" x2="21" y2="9" />
      <line x1="17" y1="15" x2="21" y2="15" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}
function ShopIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function SpeedIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  );
}
