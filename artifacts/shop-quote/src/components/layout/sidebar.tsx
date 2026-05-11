import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Wrench, FileText, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Quotes", href: "/quotes", icon: FileText },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Machines", href: "/machines", icon: Wrench },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 h-screen flex flex-col fixed left-0 top-0 print:hidden"
      style={{ background: "hsl(var(--sidebar))", borderRight: "1px solid hsl(var(--sidebar-border))" }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}>
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--sidebar-primary))" }}>
            <Wrench className="w-4 h-4" style={{ color: "hsl(var(--sidebar-primary-foreground))" }} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-widest uppercase"
              style={{ color: "hsl(var(--sidebar-foreground))", letterSpacing: "0.1em" }}>
              SHOP
            </div>
            <div className="text-xs font-medium" style={{ color: "hsl(var(--sidebar-primary))", letterSpacing: "0.15em" }}>
              QUOTE
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 pt-4">
        <div className="text-xs font-semibold uppercase tracking-widest px-3 mb-3"
          style={{ color: "hsl(220 5% 35%)" }}>
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded",
                isActive
                  ? "text-white"
                  : "hover:bg-white/5"
              )}
              style={isActive ? {
                background: "hsl(25 100% 50% / 0.18)",
                color: "hsl(25 100% 60%)",
                borderLeft: "3px solid hsl(25 100% 50%)",
              } : {
                color: "hsl(var(--sidebar-foreground))",
                borderLeft: "3px solid transparent",
              }}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Version footer */}
      <div className="px-5 py-4" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
        <div className="text-xs" style={{ color: "hsl(220 5% 35%)" }}>
          CNC Quoting Software
        </div>
      </div>
    </div>
  );
}
