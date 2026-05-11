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
    <div className="w-64 border-r bg-sidebar h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-sidebar-foreground">
          <Wrench className="w-6 h-6" />
          <span>SHOP Quote</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
