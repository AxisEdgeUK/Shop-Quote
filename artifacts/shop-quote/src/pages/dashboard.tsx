import {
  useGetDashboardStats,
  useListQuotes,
  useListFollowUps,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format, differenceInCalendarDays } from "date-fns";
import {
  FileText,
  Plus,
  Copy,
  UserPlus,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ChevronRight,
  Zap,
  Bell,
} from "lucide-react";

function KpiCard({
  label,
  value,
  sub,
  accent,
  amber,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  amber?: boolean;
}) {
  return (
    <div
      className="rounded border p-4 flex flex-col gap-1.5"
      style={{
        background: amber
          ? "hsl(38 92% 50% / 0.06)"
          : "hsl(var(--card))",
        borderColor: amber
          ? "hsl(38 92% 50% / 0.45)"
          : accent
            ? "hsl(213 97% 58% / 0.4)"
            : "hsl(var(--card-border))",
        boxShadow: amber
          ? "0 0 0 1px hsl(38 92% 50% / 0.12)"
          : accent
            ? "0 0 0 1px hsl(213 97% 58% / 0.15)"
            : undefined,
      }}
    >
      <div
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {label}
      </div>
      <div
        className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums"
        style={
          amber
            ? { color: "hsl(38 92% 42%)" }
            : accent
              ? { color: "hsl(213 97% 58%)" }
              : undefined
        }
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-xs"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, { dot: string; text: string; bg: string }> =
  {
    Draft: { dot: "bg-zinc-400", text: "text-zinc-500", bg: "bg-zinc-100" },
    Sent: { dot: "bg-blue-400", text: "text-blue-600", bg: "bg-blue-50" },
    Won: {
      dot: "bg-emerald-400",
      text: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    Lost: { dot: "bg-red-400", text: "text-red-600", bg: "bg-red-50" },
    Expired: { dot: "bg-amber-400", text: "text-amber-600", bg: "bg-amber-50" },
  };

function StatusChip({ status }: { status: string }) {
  const sc = STATUS_COLORS[status] ?? STATUS_COLORS.Draft;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
      {status}
    </span>
  );
}

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: allQuotes, isLoading: quotesLoading } = useListQuotes();
  const { data: followUps = [] } = useListFollowUps();

  const recentQuotes = (allQuotes ?? []).slice(0, 8);

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
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
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1
          className="text-xl md:text-2xl font-bold tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          Workshop Dashboard
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          {format(new Date(), "EEEE d MMMM yyyy")}
        </p>
      </div>

      {/* ── First-run onboarding guide ───────────────────────────────── */}
      {stats.totalQuotes === 0 && (
        <div
          className="rounded border px-5 py-4"
          style={{
            background: "hsl(213 97% 58% / 0.05)",
            borderColor: "hsl(213 97% 58% / 0.25)",
          }}
        >
          <p
            className="text-sm font-semibold mb-3"
            style={{ color: "hsl(213 97% 45%)" }}
          >
            Get started — 3 quick steps
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                step: "1",
                title: "Set up company details",
                desc: "Add your company name, logo, and bank details so PDFs look professional.",
                href: "/settings",
                cta: "Open Settings",
              },
              {
                step: "2",
                title: "Add your machines",
                desc: "Enter your CNC machines with hourly and setup rates for accurate costing.",
                href: "/machines",
                cta: "Add Machines",
              },
              {
                step: "3",
                title: "Create your first quote",
                desc: "Select a customer, add parts and costs, and generate a PDF in minutes.",
                href: "/quotes/new",
                cta: "New Quote",
              },
            ].map(({ step, title, desc, href, cta }) => (
              <div
                key={step}
                className="rounded border p-3 flex flex-col gap-1.5"
                style={{
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--card-border))",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                    style={{
                      background: "hsl(213 97% 58%)",
                      color: "#fff",
                    }}
                  >
                    {step}
                  </span>
                  <span className="text-sm font-semibold">{title}</span>
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {desc}
                </p>
                <Link
                  href={href}
                  className="text-xs font-medium mt-auto pt-1 self-start"
                  style={{ color: "hsl(213 97% 55%)" }}
                >
                  {cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Follow-up Needed"
          value={stats.followUpNeeded}
          sub="Sent, awaiting response"
          amber={stats.followUpNeeded > 0}
        />
        <KpiCard
          label="Total Quoted"
          value={`${cur}${stats.totalQuotedValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={`${stats.totalQuotes} quotes total`}
        />
        <KpiCard
          label="Open Quotes"
          value={stats.draftQuotes + stats.sentQuotes}
          sub={`${stats.draftQuotes} draft · ${stats.sentQuotes} sent`}
        />
        <KpiCard
          label="Win Rate"
          value={`${stats.conversionRate.toFixed(1)}%`}
          sub={`${stats.wonQuotes} won · ${stats.lostQuotes} lost`}
        />
        <KpiCard
          label="Won This Month"
          value={`${cur}${stats.wonValueThisMonth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={`${stats.wonThisMonth} order${stats.wonThisMonth === 1 ? "" : "s"} · avg ${cur}${Math.round(stats.avgWonValue).toLocaleString()}`}
          accent
        />
        <KpiCard
          label="Avg Turnaround"
          value={stats.avgTurnaroundDaysThisMonth != null ? `${stats.avgTurnaroundDaysThisMonth.toFixed(1)}d` : "—"}
          sub={stats.avgTurnaroundDaysLastMonth != null ? `Last month: ${stats.avgTurnaroundDaysLastMonth.toFixed(1)}d` : "RFQ received → quote sent"}
        />
      </div>

      {/* Follow-up action list */}
      {followUps.length > 0 && (
        <div
          className="rounded border overflow-hidden"
          style={{
            background: "hsl(38 92% 50% / 0.04)",
            borderColor: "hsl(38 92% 50% / 0.4)",
            boxShadow: "0 0 0 1px hsl(38 92% 50% / 0.1)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid hsl(38 92% 50% / 0.2)" }}
          >
            <div className="flex items-center gap-2">
              <Bell
                className="w-4 h-4"
                style={{ color: "hsl(38 92% 42%)" }}
              />
              <span
                className="text-sm font-semibold tracking-wide uppercase"
                style={{ letterSpacing: "0.06em", color: "hsl(38 92% 42%)" }}
              >
                Follow-up Chase List
              </span>
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: "hsl(38 92% 50% / 0.15)",
                  color: "hsl(38 92% 38%)",
                }}
              >
                {followUps.length}
              </span>
            </div>
            <Link href="/quotes?status=Sent">
              <span
                className="text-xs font-medium flex items-center gap-1 hover:underline"
                style={{ color: "hsl(38 92% 42%)" }}
              >
                View all sent <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>

          {/* Mobile stacked */}
          <div className="md:hidden divide-y" style={{ borderColor: "hsl(38 92% 50% / 0.15)" }}>
            {followUps.map((q) => (
              <Link key={q.id} href={`/quotes/${q.id}`}>
                <div className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-amber-50/60 transition-colors cursor-pointer">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold">{q.quoteNumber}</span>
                      <UrgencyBadge urgency={q.urgency} followUpDate={q.followUpDate} />
                    </div>
                    <div className="text-sm font-medium mt-0.5 truncate">{q.customerName}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-30" />
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop row layout */}
          <div className="hidden md:block divide-y" style={{ borderColor: "hsl(38 92% 50% / 0.15)" }}>
            {followUps.map((q) => (
              <Link key={q.id} href={`/quotes/${q.id}`}>
                <div className="flex items-center gap-4 px-5 py-3 hover:bg-amber-50/60 transition-colors cursor-pointer group">
                  <div className="w-[110px] shrink-0">
                    <div className="font-mono text-sm font-semibold">{q.quoteNumber}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{q.customerName}</div>
                  </div>
                  <div className="shrink-0">
                    <UrgencyBadge urgency={q.urgency} followUpDate={q.followUpDate} />
                  </div>
                  <ChevronRight
                    className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "hsl(38 92% 42%)" }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent quotes */}
        <div
          className="lg:col-span-2 rounded border overflow-hidden"
          style={{
            background: "hsl(var(--card))",
            borderColor: "hsl(var(--card-border))",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: "1px solid hsl(var(--card-border))" }}
          >
            <div className="flex items-center gap-2">
              <FileText
                className="w-4 h-4"
                style={{ color: "hsl(213 97% 58%)" }}
              />
              <span
                className="text-sm font-semibold tracking-wide uppercase"
                style={{
                  letterSpacing: "0.06em",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                Recent Quotes
              </span>
            </div>
            <Link href="/quotes">
              <span
                className="text-xs font-medium flex items-center gap-1 hover:underline"
                style={{ color: "hsl(213 97% 58%)" }}
              >
                View all <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>

          {quotesLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : recentQuotes.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <FileText
                className="w-10 h-10 mx-auto"
                style={{ color: "hsl(var(--muted-foreground))" }}
              />
              <div>
                <div className="font-semibold">No quotes yet</div>
                <p
                  className="text-sm mt-1"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  Create your first quote to get started.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <Link href="/quotes/new">
                  <button
                    className="px-4 py-2.5 rounded text-sm font-semibold text-white"
                    style={{ background: "hsl(213 97% 58%)" }}
                  >
                    New Quote
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div
                className="md:hidden divide-y"
                style={{ borderColor: "hsl(var(--card-border))" }}
              >
                {recentQuotes.map((q) => (
                  <Link key={q.id} href={`/quotes/${q.id}`}>
                    <div className="px-4 py-3.5 hover:bg-black/[0.02] transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold">
                              {q.quoteNumber}
                            </span>
                            <StatusChip status={q.status} />
                          </div>
                          <div className="text-sm font-medium mt-0.5 truncate">
                            {q.customerName}
                          </div>
                          <div
                            className="text-xs mt-0.5"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                          >
                            {format(new Date(q.quoteDate), "dd MMM yyyy")}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-base">
                            £
                            {q.totalValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <ChevronRight className="w-4 h-4 ml-auto mt-1 opacity-30" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop row layout */}
              <div
                className="hidden md:block divide-y"
                style={{ borderColor: "hsl(var(--card-border))" }}
              >
                {recentQuotes.map((q) => (
                  <Link key={q.id} href={`/quotes/${q.id}`}>
                    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-black/[0.02] transition-colors cursor-pointer group">
                      <div className="w-[110px] shrink-0">
                        <div className="font-mono text-sm font-semibold">
                          {q.quoteNumber}
                        </div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          {format(new Date(q.quoteDate), "dd MMM yyyy")}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {q.customerName}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-semibold text-sm">
                          £
                          {q.totalValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <div className="w-20 shrink-0 text-right">
                        <StatusChip status={q.status} />
                      </div>
                      <ChevronRight
                        className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "hsl(213 97% 58%)" }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Quick actions + pipeline */}
        <div className="space-y-4">
          <div
            className="rounded border p-4 space-y-2.5"
            style={{
              background: "hsl(var(--card))",
              borderColor: "hsl(var(--card-border))",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{
                letterSpacing: "0.08em",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              Start Work
            </div>
            <QuickAction
              href="/quotes/quick"
              icon={<Zap className="w-4 h-4" />}
              label="Quick Quote"
              primary
            />
            <QuickAction
              href="/quotes/new"
              icon={<Plus className="w-4 h-4" />}
              label="Full Quote"
            />
            <QuickAction
              href="/quotes"
              icon={<Copy className="w-4 h-4" />}
              label="Quote Similar Job"
            />
            <QuickAction
              href="/customers/new"
              icon={<UserPlus className="w-4 h-4" />}
              label="Add Customer"
            />
          </div>

          <div
            className="rounded border p-4 space-y-3"
            style={{
              background: "hsl(var(--card))",
              borderColor: "hsl(var(--card-border))",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{
                letterSpacing: "0.08em",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              Pipeline
            </div>
            <HealthRow
              icon={<BarChart3 className="w-3.5 h-3.5" />}
              label="Total Quotes"
              value={String(stats.totalQuotes)}
            />
            <HealthRow
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Awaiting Reply"
              value={String(stats.followUpNeeded)}
              warn={stats.followUpNeeded > 3}
            />
            <HealthRow
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              label="Won"
              value={String(stats.wonQuotes)}
              good
            />
            <HealthRow
              icon={<AlertCircle className="w-3.5 h-3.5" />}
              label="Lost"
              value={String(stats.lostQuotes)}
              warn={stats.lostQuotes > 0}
            />
            <HealthRow
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              label="Win Rate"
              value={`${stats.conversionRate.toFixed(1)}%`}
              good={stats.conversionRate >= 30}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link href={href}>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-all"
        style={
          primary
            ? {
                background: "hsl(213 97% 58%)",
                color: "white",
              }
            : {
                background: "hsl(var(--secondary))",
                color: "hsl(var(--secondary-foreground))",
                border: "1px solid hsl(var(--border))",
              }
        }
      >
        {icon}
        {label}
      </button>
    </Link>
  );
}

function UrgencyBadge({
  urgency,
  followUpDate,
}: {
  urgency: string;
  followUpDate: string;
}) {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const daysAgo = differenceInCalendarDays(todayDate, new Date(followUpDate + "T00:00:00"));

  if (urgency === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        {daysAgo === 1 ? "1 day overdue" : `${daysAgo} days overdue`} &middot;{" "}
        {format(new Date(followUpDate + "T00:00:00"), "dd MMM")}
      </span>
    );
  }
  if (urgency === "due_today") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Due today
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
      Due {format(new Date(followUpDate + "T00:00:00"), "EEE dd MMM")}
    </span>
  );
}

function HealthRow({
  icon,
  label,
  value,
  good,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  good?: boolean;
  warn?: boolean;
}) {
  const color = good
    ? "hsl(142 70% 50%)"
    : warn
      ? "hsl(38 92% 50%)"
      : "hsl(var(--foreground))";
  return (
    <div className="flex items-center justify-between text-sm py-0.5">
      <div
        className="flex items-center gap-2"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-mono font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
