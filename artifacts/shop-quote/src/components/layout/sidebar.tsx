import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Wrench,
  Layers,
  FileText,
  Settings as SettingsIcon,
  BarChart3,
  X,
  MessageSquare,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedbackDialog } from "@/components/feedback-dialog";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Quotes", href: "/quotes", icon: FileText },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Machines", href: "/machines", icon: Wrench },
  { name: "Materials", href: "/materials", icon: Layers },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

function ShopQuoteLogo({ size = 28 }: { size?: number }) {
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
        stroke="#1D8FFF"
        strokeWidth="1.5"
      />
      <line
        x1="14"
        y1="4"
        x2="14"
        y2="9"
        stroke="#1D8FFF"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="19"
        x2="14"
        y2="24"
        stroke="#1D8FFF"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="14"
        x2="9"
        y2="14"
        stroke="#1D8FFF"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="19"
        y1="14"
        x2="24"
        y2="14"
        stroke="#1D8FFF"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="14"
        cy="14"
        r="3.5"
        fill="none"
        stroke="#1D8FFF"
        strokeWidth="1.5"
      />
      <circle cx="14" cy="14" r="1" fill="#1D8FFF" />
    </svg>
  );
}

export { ShopQuoteLogo };

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div
      className="w-64 h-screen flex flex-col"
      style={{
        background: "hsl(var(--sidebar))",
        borderRight: "1px solid hsl(var(--sidebar-border))",
      }}
    >
      {/* Logo row */}
      <div
        className="px-5 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
      >
        <Link
          href="/"
          className="flex items-center gap-3 group"
          onClick={onClose}
        >
          <ShopQuoteLogo size={28} />
          <div>
            <div
              className="text-xs font-bold tracking-widest uppercase leading-none"
              style={{
                color: "hsl(var(--sidebar-foreground))",
                letterSpacing: "0.12em",
              }}
            >
              SHOP
            </div>
            <div
              className="text-xs font-semibold mt-0.5 leading-none"
              style={{ color: "#1D8FFF", letterSpacing: "0.18em" }}
            >
              QUOTE
            </div>
          </div>
        </Link>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded transition-colors"
            style={{ color: "hsl(var(--sidebar-foreground))" }}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 pt-4">
        <div
          className="text-xs font-semibold uppercase tracking-widest px-3 mb-3"
          style={{ color: "hsl(220 5% 35%)" }}
        >
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-3 text-sm font-medium transition-all rounded",
                !isActive && "hover:bg-white/5",
              )}
              style={
                isActive
                  ? {
                      background: "rgba(29,143,255,0.12)",
                      color: "#60AFFF",
                      borderLeft: "3px solid #1D8FFF",
                    }
                  : {
                      color: "hsl(var(--sidebar-foreground))",
                      borderLeft: "3px solid transparent",
                    }
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs" style={{ color: "hsl(220 5% 32%)" }}>
            CNC Quoting Software
          </div>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-semibold"
            style={{
              background: "rgba(29,143,255,0.08)",
              color: "#1D8FFF",
              border: "1px solid rgba(29,143,255,0.2)",
            }}
          >
            Beta v0.1
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80 w-full"
            style={{ color: "hsl(220 5% 48%)" }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Send feedback
          </button>
          <Link href="/ideas">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80 w-full"
              style={{ color: "hsl(220 5% 48%)" }}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Share an idea
            </button>
          </Link>
        </div>
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}
