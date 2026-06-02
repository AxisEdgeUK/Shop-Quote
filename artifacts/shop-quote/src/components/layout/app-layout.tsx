import { useState } from "react";
import { Link } from "wouter";
import { Menu } from "lucide-react";
import { Sidebar, ShopQuoteLogo } from "./sidebar";
import { ErrorBoundary } from "@/components/error-boundary";

function MobileTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 print:hidden"
      style={{
        background: "hsl(var(--background))",
        borderBottom: "1px solid hsl(var(--border))",
      }}
    >
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <ShopQuoteLogo size={24} />
        <div>
          <div
            className="text-xs font-bold tracking-widest uppercase leading-none"
            style={{ letterSpacing: "0.12em", color: "hsl(var(--foreground))" }}
          >
            SHOP
          </div>
          <div
            className="text-xs font-semibold leading-none mt-0.5"
            style={{ color: "#1D8FFF", letterSpacing: "0.18em" }}
          >
            QUOTE
          </div>
        </div>
      </Link>
      <button
        onClick={onMenuClick}
        className="p-2 rounded-md transition-colors"
        style={{ color: "hsl(var(--foreground))" }}
        aria-label="Open navigation menu"
      >
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MobileTopBar onMenuClick={() => setMobileOpen(true)} />

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed desktop, overlay mobile */}
      <div
        className={`fixed top-0 left-0 z-50 transition-transform duration-300 print:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <Sidebar onClose={() => setMobileOpen(false)} />
      </div>

      {/* Main content */}
      <main className="md:ml-64 pt-14 md:pt-0 p-4 md:p-8 print:ml-0 print:p-0">
        <div
          className="mb-5 px-3 py-2 rounded text-xs text-center print:hidden"
          style={{
            background: "rgba(29,143,255,0.05)",
            color: "#64748B",
            border: "1px solid rgba(29,143,255,0.1)",
          }}
        >
          Beta version — for workflow testing only. Always check all figures
          before sending live quotes.
        </div>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
