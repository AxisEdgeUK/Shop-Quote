import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, FileText, PenLine } from "lucide-react";
import { DrawingViewer } from "./drawing-viewer";
import { ScanContextProvider } from "@/contexts/scan-context";

interface QuoteWorkspaceProps {
  title: string;
  backHref?: string;
  children: React.ReactNode;
  quoteId?: number;
}

const BLUE = "#1D8FFF";

export function QuoteWorkspace({
  title,
  backHref = "/quotes",
  children,
  quoteId,
}: QuoteWorkspaceProps) {
  const [splitPct, setSplitPct] = useState(46);
  const [mobileTab, setMobileTab] = useState<"drawing" | "quote">("quote");
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const raw = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.max(22, Math.min(72, raw)));
    };

    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  return (
    <ScanContextProvider>
      {/* ── DESKTOP ─── sticky-drawing, single-page-scroll workspace ──
           The page (body) is the ONE scroll context.
           The drawing panel is sticky — it stays glued to the viewport
           as the user scrolls the form. No nested scroll containers. */}
      <div className="hidden md:block -mx-8 -mb-8">
        {/* Header — sticky at top of viewport */}
        <div className="sticky top-0 z-20">
          <WorkspaceHeader title={title} backHref={backHref} />
        </div>

        {/* Two-column layout — items-start so sticky children work */}
        <div ref={containerRef} className="flex items-start">
          {/* Left — drawing: sticky, always in view */}
          <div
            className="shrink-0 sticky overflow-hidden"
            style={{
              top: 44,
              height: "calc(100vh - 44px)",
              width: `${splitPct}%`,
            }}
          >
            <DrawingViewer quoteId={quoteId} />
          </div>

          {/* Divider — sticky, matches drawing height */}
          <div
            className="shrink-0 relative flex items-center justify-center sticky"
            style={{
              top: 44,
              height: "calc(100vh - 44px)",
              width: 6,
              background: "#E0E0E0",
              cursor: "col-resize",
              zIndex: 10,
            }}
            onMouseDown={handleDividerMouseDown}
          >
            <DividerHandle />
          </div>

          {/* Right — quote builder: flex container so the wizard can render
               its own scrollable content + sticky summary side-by-side.
               No overflow set here so sticky children work via page scroll. */}
          <div
            className="flex-1 flex"
            style={{
              background: "#F5F7FA",
              minHeight: "calc(100vh - 44px)",
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* ── MOBILE ─── tab workspace (scroll container is intentional here) ── */}
      <div
        className="flex md:hidden flex-col -mx-4 -mt-4 -mb-4"
        style={{ height: "calc(100svh - 3.5rem)" }}
      >
        {/* Header */}
        <WorkspaceHeader title={title} backHref={backHref} />

        {/* Tab bar */}
        <div
          className="flex shrink-0"
          style={{
            background: "hsl(var(--card))",
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          <MobileTab
            label="Drawing"
            icon={<FileText className="w-4 h-4" />}
            active={mobileTab === "drawing"}
            onClick={() => setMobileTab("drawing")}
          />
          <MobileTab
            label="Quote"
            icon={<PenLine className="w-4 h-4" />}
            active={mobileTab === "quote"}
            onClick={() => setMobileTab("quote")}
          />
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === "drawing" ? (
            <DrawingViewer quoteId={quoteId} />
          ) : (
            <div
              className="h-full overflow-y-auto flex"
              style={{ background: "#F5F7FA" }}
            >
              <div className="flex-1 min-w-0">{children}</div>
            </div>
          )}
        </div>
      </div>
    </ScanContextProvider>
  );
}

function WorkspaceHeader({
  title,
  backHref,
}: {
  title: string;
  backHref: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 shrink-0"
      style={{
        background: "#161B22",
        borderBottom: "1px solid #30363D",
        height: 44,
      }}
    >
      <Link href={backHref}>
        <button
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded transition-colors"
          style={{ color: "#8B949E" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#E6EDF3")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8B949E")}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </Link>
      <div className="w-px h-5 mx-1" style={{ background: "#30363D" }} />
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full" style={{ background: BLUE }} />
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: "#E6EDF3" }}
        >
          {title}
        </span>
      </div>
      <div className="ml-auto hidden lg:flex items-center gap-1.5">
        <span
          className="text-xs px-2 py-0.5 rounded font-mono"
          style={{
            background: "rgba(29,143,255,0.12)",
            color: BLUE,
            letterSpacing: "0.08em",
            border: "1px solid rgba(29,143,255,0.2)",
          }}
        >
          ESTIMATING WORKSPACE
        </span>
      </div>
    </div>
  );
}

function DividerHandle() {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="w-1 h-14 rounded-full transition-colors"
      style={{ background: hov ? BLUE : "#2D333B" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    />
  );
}

function MobileTab({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors"
      style={{
        color: active ? BLUE : "hsl(var(--muted-foreground))",
        borderBottom: active ? `2px solid ${BLUE}` : "2px solid transparent",
      }}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
