import { useGetDashboardStats, useListQuotes } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  FileText, Plus, Copy, UserPlus, TrendingUp, Clock, CheckCircle2,
  AlertCircle, BarChart3, ChevronRight
} from "lucide-react";

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded border p-5 flex flex-col gap-2"
      style={{
        background: "hsl(var(--card))",
        borderColor: accent ? "hsl(25 100% 50% / 0.4)" : "hsl(var(--card-border))",
        boxShadow: accent ? "0 0 0 1px hsl(25 100% 50% / 0.15)" : undefined,
      }}>
      <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</div>
      <div className={`text-3xl font-bold tracking-tight tabular-nums ${accent ? "text-primary" : ""}`}
        style={accent ? { color: "hsl(25 100% 50%)" } : undefined}>
        {value}
      </div>
      {sub && <div className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{sub}</div>}
    </div>
  );
}

const STATUS_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  Draft:   { dot: "bg-zinc-400",   text: "text-zinc-400",   bg: "bg-zinc-400/10" },
  Sent:    { dot: "bg-blue-400",   text: "text-blue-400",   bg: "bg-blue-400/10" },
  Won:     { dot: "bg-emerald-400",text: "text-emerald-400",bg: "bg-emerald-400/10" },
  Lost:    { dot: "bg-red-400",    text: "text-red-400",    bg: "bg-red-400/10" },
  Expired: { dot: "bg-amber-400",  text: "text-amber-400",  bg: "bg-amber-400/10" },
};

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: allQuotes, isLoading: quotesLoading } = useListQuotes();

  const recentQuotes = (allQuotes ?? []).slice(0, 8);

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const cur = "£";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>Workshop Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          {format(new Date(), "EEEE d MMMM yyyy")}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Open Quotes"
          value={stats.draftQuotes + stats.sentQuotes}
          sub={`${stats.draftQuotes} draft · ${stats.sentQuotes} sent`}
        />
        <KpiCard
          label="Won This Month"
          value={`${cur}${stats.wonValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={`${stats.wonQuotes} order${stats.wonQuotes === 1 ? "" : "s"} won`}
          accent
        />
        <KpiCard
          label="Win Rate"
          value={`${stats.conversionRate.toFixed(1)}%`}
          sub={`${stats.wonQuotes} won · ${stats.lostQuotes} lost`}
        />
        <KpiCard
          label="Follow-up Needed"
          value={stats.followUpNeeded}
          sub="Sent, awaiting response"
        />
        <KpiCard
          label="Total Quoted"
          value={`${cur}${stats.totalQuotedValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={`${stats.totalQuotes} quotes total`}
        />
      </div>

      {/* Main area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent quotes — left 2/3 */}
        <div className="lg:col-span-2 rounded border overflow-hidden"
          style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid hsl(var(--card-border))" }}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: "hsl(25 100% 50%)" }} />
              <span className="text-sm font-semibold tracking-wide uppercase"
                style={{ letterSpacing: "0.06em", color: "hsl(var(--muted-foreground))" }}>
                Recent Quotes
              </span>
            </div>
            <Link href="/quotes">
              <span className="text-xs font-medium flex items-center gap-1 hover:underline"
                style={{ color: "hsl(25 100% 50%)" }}>
                View all <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>

          {quotesLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : recentQuotes.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <FileText className="w-10 h-10 mx-auto" style={{ color: "hsl(var(--muted-foreground))" }} />
              <div>
                <div className="font-semibold">No quotes yet</div>
                <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Create your first quote to get started.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <Link href="/quotes/new">
                  <button className="px-4 py-2 rounded text-sm font-semibold text-white"
                    style={{ background: "hsl(25 100% 50%)" }}>
                    + New Milling Quote
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "hsl(var(--card-border))" }}>
              {recentQuotes.map((q) => {
                const sc = STATUS_COLORS[q.status] ?? STATUS_COLORS.Draft;
                return (
                  <Link key={q.id} href={`/quotes/${q.id}`}>
                    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors cursor-pointer group">
                      <div className="w-[110px] shrink-0">
                        <div className="font-mono text-sm font-semibold">{q.quoteNumber}</div>
                        <div className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {format(new Date(q.quoteDate), "dd MMM yyyy")}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{q.customerName}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-semibold text-sm">
                          £{q.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="w-20 shrink-0 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {q.status}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "hsl(25 100% 50%)" }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions — right 1/3 */}
        <div className="space-y-3">
          <div className="rounded border p-5 space-y-3"
            style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ letterSpacing: "0.08em", color: "hsl(var(--muted-foreground))" }}>
              Quick Actions
            </div>
            <QuickAction href="/quotes/new?template=milling" icon={<Plus className="w-4 h-4" />} label="New Milling Quote" primary />
            <QuickAction href="/quotes/new?template=turning" icon={<Plus className="w-4 h-4" />} label="New Turning Quote" />
            <QuickAction href="/quotes/new" icon={<Plus className="w-4 h-4" />} label="New Quote" />
            <QuickAction href="/quotes" icon={<Copy className="w-4 h-4" />} label="Duplicate Quote" />
            <QuickAction href="/customers/new" icon={<UserPlus className="w-4 h-4" />} label="Add Customer" />
          </div>

          {/* Health snapshot */}
          <div className="rounded border p-5 space-y-3"
            style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}>
            <div className="text-xs font-semibold uppercase tracking-widest"
              style={{ letterSpacing: "0.08em", color: "hsl(var(--muted-foreground))" }}>
              Pipeline
            </div>
            <HealthRow icon={<BarChart3 className="w-3.5 h-3.5" />} label="Total Quotes" value={String(stats.totalQuotes)} />
            <HealthRow icon={<Clock className="w-3.5 h-3.5" />} label="Awaiting Reply" value={String(stats.followUpNeeded)} warn={stats.followUpNeeded > 3} />
            <HealthRow icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Won" value={String(stats.wonQuotes)} good />
            <HealthRow icon={<AlertCircle className="w-3.5 h-3.5" />} label="Lost" value={String(stats.lostQuotes)} warn={stats.lostQuotes > 0} />
            <HealthRow icon={<TrendingUp className="w-3.5 h-3.5" />} label="Win Rate" value={`${stats.conversionRate.toFixed(1)}%`} good={stats.conversionRate >= 30} />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label, primary }: { href: string; icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <Link href={href}>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-all"
        style={primary ? {
          background: "hsl(25 100% 50%)",
          color: "white",
        } : {
          background: "hsl(var(--secondary))",
          color: "hsl(var(--secondary-foreground))",
          border: "1px solid hsl(var(--border))",
        }}
      >
        {icon}
        {label}
      </button>
    </Link>
  );
}

function HealthRow({ icon, label, value, good, warn }: { icon: React.ReactNode; label: string; value: string; good?: boolean; warn?: boolean }) {
  const color = good ? "hsl(142 70% 50%)" : warn ? "hsl(38 92% 50%)" : "hsl(var(--foreground))";
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2" style={{ color: "hsl(var(--muted-foreground))" }}>
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-mono font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}
