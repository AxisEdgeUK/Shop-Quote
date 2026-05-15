import { useMemo } from "react";
import { useParams, Link } from "wouter";
import { useGetCustomer, useListQuotes } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Trophy,
  TrendingUp,
  FileText,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  Sent: "bg-blue-50 text-blue-600 border-blue-200",
  Won: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Lost: "bg-red-50 text-red-600 border-red-200",
  Expired: "bg-amber-50 text-amber-600 border-amber-200",
};

export function CustomerView() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const { data: customer, isLoading: loadingCustomer } = useGetCustomer(id);
  const { data: allQuotes, isLoading: loadingQuotes } = useListQuotes();

  const quotes = useMemo(
    () => (allQuotes ?? []).filter((q) => q.customerId === id),
    [allQuotes, id],
  );

  const stats = useMemo(() => {
    const wonQ = quotes.filter((q) => q.status === "Won");
    const lostQ = quotes.filter((q) => q.status === "Lost");
    const totalValue = quotes.reduce((s, q) => s + q.totalValue, 0);
    const wonValue = wonQ.reduce((s, q) => s + q.totalValue, 0);
    const closedCount = wonQ.length + lostQ.length;
    const winRate =
      closedCount > 0 ? (wonQ.length / closedCount) * 100 : 0;
    return {
      totalQuotes: quotes.length,
      wonQuotes: wonQ.length,
      lostQuotes: lostQ.length,
      totalValue,
      wonValue,
      winRate,
    };
  }, [quotes]);

  const isLoading = loadingCustomer || loadingQuotes;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-24">
        <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Customer not found.
        </p>
        <Link href="/customers">
          <Button variant="outline" className="mt-4">
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  const cur = "£";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1
              className="text-xl md:text-2xl font-bold tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              {customer.companyName}
            </h1>
            {customer.contactName && (
              <p
                className="text-sm mt-0.5"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                {customer.contactName}
              </p>
            )}
          </div>
        </div>
        <Link href={`/customers/${id}/edit`}>
          <Button variant="outline" size="sm">
            <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
        </Link>
      </div>

      {/* Contact info */}
      <div
        className="rounded border p-4 grid grid-cols-1 md:grid-cols-3 gap-3"
        style={{
          background: "hsl(var(--card))",
          borderColor: "hsl(var(--card-border))",
        }}
      >
        {customer.email && (
          <a
            href={`mailto:${customer.email}`}
            className="flex items-center gap-2 text-sm hover:underline"
            style={{ color: "hsl(213 97% 58%)" }}
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </a>
        )}
        {customer.phone && (
          <a
            href={`tel:${customer.phone}`}
            className="flex items-center gap-2 text-sm hover:underline"
            style={{ color: "hsl(213 97% 58%)" }}
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span>{customer.phone}</span>
          </a>
        )}
        {customer.address && (
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{customer.address}</span>
          </div>
        )}
        {!customer.email && !customer.phone && !customer.address && (
          <p
            className="text-sm col-span-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            No contact details on file.
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          className="rounded border p-3 flex flex-col gap-1"
          style={{
            background: "hsl(var(--card))",
            borderColor: "hsl(var(--card-border))",
          }}
        >
          <div
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <FileText className="w-3.5 h-3.5" /> Total Quotes
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {stats.totalQuotes}
          </div>
        </div>
        <div
          className="rounded border p-3 flex flex-col gap-1"
          style={{
            background: "hsl(var(--card))",
            borderColor: "hsl(213 97% 58% / 0.4)",
            boxShadow: "0 0 0 1px hsl(213 97% 58% / 0.15)",
          }}
        >
          <div
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <Trophy className="w-3.5 h-3.5" /> Won Value
          </div>
          <div
            className="text-2xl font-bold tabular-nums"
            style={{ color: "hsl(213 97% 58%)" }}
          >
            {cur}
            {stats.wonValue.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </div>
        </div>
        <div
          className="rounded border p-3 flex flex-col gap-1"
          style={{
            background: "hsl(var(--card))",
            borderColor: "hsl(var(--card-border))",
          }}
        >
          <div
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Win Rate
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {stats.winRate.toFixed(0)}%
          </div>
          <div
            className="text-xs"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {stats.wonQuotes}W · {stats.lostQuotes}L
          </div>
        </div>
        <div
          className="rounded border p-3 flex flex-col gap-1"
          style={{
            background: "hsl(var(--card))",
            borderColor: "hsl(var(--card-border))",
          }}
        >
          <div
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Total Quoted
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {cur}
            {stats.totalValue.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </div>
        </div>
      </div>

      {/* Quote history */}
      <div
        className="rounded border overflow-hidden"
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
              Quote History
            </span>
          </div>
          <Link href={`/quotes/new`}>
            <Button size="sm" variant="outline">
              New Quote
            </Button>
          </Link>
        </div>

        {quotes.length === 0 ? (
          <div className="py-16 text-center">
            <FileText
              className="w-8 h-8 mx-auto mb-3"
              style={{ color: "hsl(var(--muted-foreground))" }}
            />
            <p
              className="text-sm"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              No quotes yet for this customer.
            </p>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "hsl(var(--card-border))" }}
          >
            {quotes.map((q) => (
              <Link key={q.id} href={`/quotes/${q.id}`}>
                <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-black/[0.02] transition-colors cursor-pointer group">
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
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[q.status] ?? STATUS_COLORS.Draft}`}
                    >
                      {q.status}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-semibold text-sm">
                      {cur}
                      {q.totalValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "hsl(213 97% 58%)" }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
