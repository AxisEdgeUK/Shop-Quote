import { useMemo } from "react";
import { useListQuotes } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  ChevronRight,
} from "lucide-react";

function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="rounded border p-4 flex flex-col gap-1.5"
      style={{
        background: "hsl(var(--card))",
        borderColor: accent
          ? "hsl(213 97% 58% / 0.4)"
          : "hsl(var(--card-border))",
        boxShadow: accent ? "0 0 0 1px hsl(213 97% 58% / 0.15)" : undefined,
      }}
    >
      <div
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {icon}
        {label}
      </div>
      <div
        className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums"
        style={accent ? { color: "hsl(213 97% 58%)" } : undefined}
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

export function AnalyticsPage() {
  const { data: allQuotes, isLoading } = useListQuotes();

  const stats = useMemo(() => {
    const quotes = allQuotes ?? [];
    const wonQuotes = quotes.filter((q) => q.status === "Won");
    const lostQuotes = quotes.filter((q) => q.status === "Lost");

    const totalValue = quotes.reduce((s, q) => s + q.totalValue, 0);
    const wonValue = wonQuotes.reduce((s, q) => s + q.totalValue, 0);
    const lostValue = lostQuotes.reduce((s, q) => s + q.totalValue, 0);
    const closedCount = wonQuotes.length + lostQuotes.length;
    const winRate = closedCount > 0 ? (wonQuotes.length / closedCount) * 100 : 0;
    const avgWon =
      wonQuotes.length > 0 ? wonValue / wonQuotes.length : 0;
    const avgQuote =
      quotes.length > 0 ? totalValue / quotes.length : 0;

    const customerMap = new Map<
      number,
      {
        name: string;
        id: number;
        wonValue: number;
        wonCount: number;
        totalQuotes: number;
        totalValue: number;
      }
    >();
    for (const q of quotes) {
      const key = q.customerId;
      const existing = customerMap.get(key) ?? {
        name: q.customerName,
        id: q.customerId,
        wonValue: 0,
        wonCount: 0,
        totalQuotes: 0,
        totalValue: 0,
      };
      existing.totalQuotes++;
      existing.totalValue += q.totalValue;
      if (q.status === "Won") {
        existing.wonValue += q.totalValue;
        existing.wonCount++;
      }
      customerMap.set(key, existing);
    }
    const topCustomers = [...customerMap.values()]
      .sort((a, b) => b.wonValue - a.wonValue)
      .slice(0, 8);

    const reasonMap = new Map<string, number>();
    for (const q of lostQuotes) {
      const reason = (q as any).lostReason || "Unknown";
      reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
    }
    const lostReasons = [...reasonMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count }));

    const monthMap = new Map<
      string,
      { won: number; lost: number; wonValue: number }
    >();
    for (const q of quotes) {
      if (q.status !== "Won" && q.status !== "Lost") continue;
      try {
        const key = format(new Date(q.quoteDate), "yyyy-MM");
        const existing = monthMap.get(key) ?? {
          won: 0,
          lost: 0,
          wonValue: 0,
        };
        if (q.status === "Won") {
          existing.won++;
          existing.wonValue += q.totalValue;
        } else {
          existing.lost++;
        }
        monthMap.set(key, existing);
      } catch {
        // ignore invalid dates
      }
    }
    const monthlyTrend = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month,
        label: format(new Date(month + "-01"), "MMM yy"),
        ...data,
      }));

    return {
      totalQuotes: quotes.length,
      wonCount: wonQuotes.length,
      lostCount: lostQuotes.length,
      totalValue,
      wonValue,
      lostValue,
      winRate,
      avgWon,
      avgQuote,
      topCustomers,
      lostReasons,
      monthlyTrend,
    };
  }, [allQuotes]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const cur = "£";
  const maxWonValue = Math.max(...stats.topCustomers.map((c) => c.wonValue), 1);
  const maxMonthWon = Math.max(
    ...stats.monthlyTrend.map((m) => m.won + m.lost),
    1,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-xl md:text-2xl font-bold tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          Analytics
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Win/loss analysis and revenue trends
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Quoted"
          value={`${cur}${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${stats.totalQuotes} quotes`}
          icon={<BarChart3 className="w-3.5 h-3.5" />}
        />
        <StatCard
          label="Won Value"
          value={`${cur}${stats.wonValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${stats.wonCount} won · avg ${cur}${Math.round(stats.avgWon).toLocaleString()}`}
          accent
          icon={<Trophy className="w-3.5 h-3.5" />}
        />
        <StatCard
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          sub={`${stats.wonCount} won · ${stats.lostCount} lost`}
          icon={<TrendingUp className="w-3.5 h-3.5" />}
        />
        <StatCard
          label="Avg Quote Value"
          value={`${cur}${Math.round(stats.avgQuote).toLocaleString()}`}
          sub={`Lost value ${cur}${stats.lostValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={<TrendingDown className="w-3.5 h-3.5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top customers */}
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
              <Users
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
                Top Customers by Won Value
              </span>
            </div>
          </div>

          {stats.topCustomers.length === 0 ? (
            <div className="py-16 text-center">
              <p
                className="text-sm"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                No won quotes yet. Mark quotes as won to see data here.
              </p>
            </div>
          ) : (
            <div
              className="divide-y"
              style={{ borderColor: "hsl(var(--card-border))" }}
            >
              {stats.topCustomers.map((c) => (
                <Link key={c.id} href={`/customers/${c.id}`}>
                  <div className="flex items-center gap-4 px-4 py-3 hover:bg-black/[0.02] transition-colors cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {c.name}
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        {c.totalQuotes} quote{c.totalQuotes !== 1 ? "s" : ""} ·{" "}
                        {c.wonCount} won
                      </div>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className="h-2 rounded-full flex-1 overflow-hidden"
                        style={{
                          background: "hsl(var(--muted))",
                          maxWidth: 120,
                        }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            background: "hsl(213 97% 58%)",
                            width: `${(c.wonValue / maxWonValue) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold text-sm">
                        {cur}
                        {c.wonValue.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                    </div>
                    <ChevronRight
                      className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column: lost reasons + monthly */}
        <div className="space-y-4">
          {/* Lost reasons */}
          <div
            className="rounded border overflow-hidden"
            style={{
              background: "hsl(var(--card))",
              borderColor: "hsl(var(--card-border))",
            }}
          >
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid hsl(var(--card-border))" }}
            >
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{
                  letterSpacing: "0.08em",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                Lost Reasons
              </span>
            </div>
            {stats.lostReasons.length === 0 ? (
              <div
                className="px-4 py-6 text-center text-sm"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                No lost quotes yet
              </div>
            ) : (
              <div
                className="divide-y"
                style={{ borderColor: "hsl(var(--card-border))" }}
              >
                {stats.lostReasons.map(({ reason, count }) => (
                  <div
                    key={reason}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-sm truncate">{reason}</span>
                    <span
                      className="text-xs font-mono font-bold ml-2 shrink-0 px-2 py-0.5 rounded-full"
                      style={{
                        background: "hsl(0 84% 95%)",
                        color: "hsl(0 72% 51%)",
                      }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly trend */}
          {stats.monthlyTrend.length > 0 && (
            <div
              className="rounded border overflow-hidden"
              style={{
                background: "hsl(var(--card))",
                borderColor: "hsl(var(--card-border))",
              }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid hsl(var(--card-border))" }}
              >
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{
                    letterSpacing: "0.08em",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  Monthly Trend (closed)
                </span>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {stats.monthlyTrend.map((m) => (
                  <div key={m.month} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        {m.label}
                      </span>
                      <span className="font-medium">
                        {m.won}W / {m.lost}L
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden flex"
                      style={{ background: "hsl(var(--muted))" }}
                    >
                      <div
                        className="h-full"
                        style={{
                          background: "hsl(142 70% 50%)",
                          width: `${((m.won + m.lost) / maxMonthWon) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
