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
      <line
        x1="14"
        y1="4"
        x2="14"
        y2="9"
        stroke={BLUE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="19"
        x2="14"
        y2="24"
        stroke={BLUE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="14"
        x2="9"
        y2="14"
        stroke={BLUE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="19"
        y1="14"
        x2="24"
        y2="14"
        stroke={BLUE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="14"
        cy="14"
        r="3.5"
        fill="none"
        stroke={BLUE}
        strokeWidth="1.5"
      />
      <circle cx="14" cy="14" r="1" fill={BLUE} />
    </svg>
  );
}

function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <LogoMark />
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            color: "#111827",
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
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            DASHBOARD
          </button>
        </Link>
      </header>

      <main style={{ padding: "100px 3rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
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
              PRICING
            </div>
            <h1
              style={{
                fontWeight: 800,
                fontSize: "clamp(2rem, 4vw, 3.2rem)",
                letterSpacing: "-0.025em",
                color: "#111827",
                marginBottom: 16,
              }}
            >
              Straightforward. Honest.
            </h1>
            <p
              style={{
                color: "#6b7280",
                maxWidth: 440,
                margin: "0 auto",
                lineHeight: 1.75,
                fontSize: "0.9rem",
              }}
            >
              Built for small machine shops, not enterprise ERP complexity. No
              per-user charges. No hidden fees.
            </p>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
          >
            {/* Monthly */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                padding: "48px 40px",
                boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  marginBottom: 24,
                }}
              >
                MONTHLY PLAN
              </div>
              <div style={{ marginBottom: 4 }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "3rem",
                    color: "#111827",
                    letterSpacing: "-0.03em",
                  }}
                >
                  £92.50
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 36 }}>
                per month, minimum 12 months
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginBottom: 36,
                }}
              >
                {[
                  "Unlimited quotes",
                  "Unlimited customers",
                  "Unlimited machines",
                  "PDF exports",
                  "Email support",
                ].map((f) => (
                  <div key={f} style={{ fontSize: 13, color: "#374151" }}>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/dashboard">
                <button
                  style={{
                    width: "100%",
                    padding: "13px 0",
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    background: "transparent",
                    border: "1px solid #d1d5db",
                    color: "#6b7280",
                    cursor: "pointer",
                    transition: "border-color 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = BLUE;
                    e.currentTarget.style.color = BLUE;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.color = "#6b7280";
                  }}
                >
                  START MONTHLY
                </button>
              </Link>
            </div>

            {/* Lifetime column: context note + card */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    letterSpacing: "0.01em",
                    lineHeight: 1.6,
                    margin: 0,
                    fontWeight: 400,
                  }}
                >
                  Equivalent to approximately £2.74 per day over one year.
                </p>
              </div>

            {/* Lifetime */}
            <div
              style={{
                background: "#ffffff",
                border: `2px solid ${BLUE}`,
                padding: "48px 40px",
                boxShadow: `0 4px 24px rgba(29,143,255,0.12)`,
              }}
            >
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
                ★ RECOMMENDED
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  color: BLUE,
                  textTransform: "uppercase",
                  marginBottom: 24,
                }}
              >
                FOUNDER LIFETIME
              </div>
              <div style={{ marginBottom: 4 }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "3rem",
                    color: "#111827",
                    letterSpacing: "-0.03em",
                  }}
                >
                  £999
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 36 }}>
                one-off payment, yours forever
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginBottom: 36,
                }}
              >
                {[
                  "All monthly features",
                  "Pay once, use forever",
                  "Priority support",
                  "All future updates included",
                  "Early access to new features",
                ].map((f) => (
                  <div key={f} style={{ fontSize: 13, color: "#374151" }}>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/dashboard">
                <button
                  style={{
                    width: "100%",
                    padding: "13px 0",
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
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#0A78E8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = BLUE)
                  }
                >
                  BUY LIFETIME ACCESS
                </button>
              </Link>
            </div>
            </div>
          </div>

          <p
            style={{
              marginTop: 28,
              fontSize: 12,
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            No hidden fees. No per-user charges. No ERP complexity.
          </p>

          {/* FAQ */}
          <div
            style={{
              marginTop: 80,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 24,
            }}
          >
            {[
              {
                q: "Who is this for?",
                a: "Small CNC machine shops with 1–20 people who quote milling and turning work regularly.",
              },
              {
                q: "What if I need help?",
                a: "Email support is included on all plans. Lifetime access includes priority support.",
              },
              {
                q: "Can I cancel?",
                a: "Monthly plan cancels anytime. Lifetime is a one-off purchase. No subscriptions, no surprises.",
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  padding: "32px 28px",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "#111827",
                    fontSize: "0.9rem",
                    marginBottom: 12,
                  }}
                >
                  {q}
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    lineHeight: 1.75,
                  }}
                >
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            © {new Date().getFullYear()} SHOP Quote
          </span>
          <Link href="/">
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              ← Back to home
            </span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
