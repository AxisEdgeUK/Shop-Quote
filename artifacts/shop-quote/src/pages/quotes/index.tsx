import { useState, useMemo } from "react";
import {
  useListQuotes,
  useDeleteQuote,
  getListQuotesQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Copy,
  ChevronRight,
  Zap,
  CheckCheck,
  Trophy,
  XCircle,
  Search,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";

const ALL_STATUSES = ["Draft", "Sent", "Won", "Lost", "Expired"];

const STATUS_COLORS: Record<string, { dot: string; text: string; bg: string }> =
  {
    Draft: { dot: "bg-zinc-400", text: "text-zinc-600", bg: "bg-zinc-100" },
    Sent: { dot: "bg-blue-400", text: "text-blue-700", bg: "bg-blue-50" },
    Won: {
      dot: "bg-emerald-400",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    Lost: { dot: "bg-red-400", text: "text-red-700", bg: "bg-red-50" },
    Expired: { dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50" },
  };

export function QuotesList() {
  const { data: quotes, isLoading } = useListQuotes();
  const deleteQuote = useDeleteQuote();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredQuotes = useMemo(() => {
    let list = quotes ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (quote) =>
          quote.quoteNumber.toLowerCase().includes(q) ||
          quote.customerName.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((quote) => quote.status === statusFilter);
    }
    return list;
  }, [quotes, searchQuery, statusFilter]);

  const allIds = filteredQuotes.map((q) => q.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedQuotes = quotes?.filter((q) => selectedIds.has(q.id)) ?? [];
  const hasWonOrSent = selectedQuotes.some(
    (q) => q.status === "Won" || q.status === "Sent",
  );

  const handleBulkDelete = async () => {
    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/quotes/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
      toast({ title: `${selectedIds.size} quote${selectedIds.size > 1 ? "s" : ""} deleted` });
      clearSelection();
    } catch {
      toast({ title: "Failed to delete quotes", variant: "destructive" });
    } finally {
      setIsBulkLoading(false);
      setConfirmDelete(false);
    }
  };

  const handleBulkStatus = async (status: string) => {
    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/quotes/bulk/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
      toast({ title: `${selectedIds.size} quote${selectedIds.size > 1 ? "s" : ""} marked as ${status}` });
      clearSelection();
    } catch {
      toast({ title: "Failed to update quotes", variant: "destructive" });
    } finally {
      setIsBulkLoading(false);
      setConfirmStatus(null);
    }
  };

  const handleDelete = (id: number) => {
    deleteQuote.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          toast({ title: "Quote deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete quote", variant: "destructive" });
        },
      },
    );
  };

  const handleClone = async (id: number) => {
    try {
      const res = await fetch(`/api/quotes/${id}/clone`, { method: "POST" });
      if (!res.ok) throw new Error();
      const newQuote = await res.json();
      queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
      navigate(`/quotes/${newQuote.id}/edit`);
    } catch {
      toast({ title: "Failed to clone quote", variant: "destructive" });
    }
  };

  const statusChip = (status: string) => {
    const sc = STATUS_COLORS[status] ?? STATUS_COLORS.Draft;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
        {status}
      </span>
    );
  };

  const deleteDialog = (id: number, quoteNumber: string) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive h-10 w-10"
          title="Delete"
          data-testid={`button-delete-quote-${id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Quote</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {quoteNumber}? This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleDelete(id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className={`space-y-5 ${someSelected ? "pb-24 md:pb-6" : ""}`}>
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Quotes
        </h1>
        <div className="flex gap-2">
          <Link href="/quotes/new">
            <Button variant="outline" className="h-11 px-4" data-testid="button-new-quote">
              <Plus className="w-4 h-4 mr-1.5" />
              Full Quote
            </Button>
          </Link>
          <Link href="/quotes/quick">
            <Button className="h-11 px-5">
              <Zap className="w-4 h-4 mr-1.5" />
              Quick Quote
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 h-10"
            placeholder="Search by quote # or customer…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-full sm:w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{searchQuery || statusFilter !== "all" ? "No quotes match your filters." : "No quotes yet. Create your first one."}</p>
          </div>
        ) : (
          filteredQuotes.map((quote) => {
            const sc = STATUS_COLORS[quote.status] ?? STATUS_COLORS.Draft;
            const isSelected = selectedIds.has(quote.id);
            return (
              <div
                key={quote.id}
                className={`rounded-xl border bg-card overflow-hidden transition-colors ${isSelected ? "border-primary ring-1 ring-primary" : ""}`}
                style={isSelected ? undefined : { borderColor: "hsl(var(--card-border))" }}
                data-testid={`row-quote-${quote.id}`}
              >
                <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(quote.id)}
                    className="mt-1 shrink-0"
                    aria-label={`Select ${quote.quoteNumber}`}
                  />
                  <Link href={`/quotes/${quote.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold">
                        {quote.quoteNumber}
                      </span>
                      {statusChip(quote.status)}
                    </div>
                    <div className="font-semibold text-base mt-1 truncate">
                      {quote.customerName}
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >
                      {format(new Date(quote.quoteDate), "dd MMM yyyy")} ·
                      valid until{" "}
                      {format(new Date(quote.validUntil), "dd MMM yyyy")}
                    </div>
                  </Link>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-lg">
                      £
                      {quote.totalValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <ChevronRight className="w-4 h-4 ml-auto mt-1 opacity-40" />
                  </div>
                </div>
                <div
                  className="flex items-center gap-1 px-3 pb-3 pt-1 border-t"
                  style={{ borderColor: "hsl(var(--card-border))" }}
                >
                  <Link href={`/quotes/${quote.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 px-3 text-xs gap-1.5"
                      data-testid={`button-view-quote-${quote.id}`}
                    >
                      <FileText className="w-3.5 h-3.5" /> View
                    </Button>
                  </Link>
                  <Link href={`/quotes/${quote.id}/edit`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 px-3 text-xs gap-1.5"
                      data-testid={`button-edit-quote-${quote.id}`}
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 px-3 text-xs gap-1.5"
                    onClick={() => handleClone(quote.id)}
                    data-testid={`button-clone-quote-${quote.id}`}
                  >
                    <Copy className="w-3.5 h-3.5" /> Clone
                  </Button>
                  {deleteDialog(quote.id, quote.quoteNumber)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                  className={
                    someSelected && !allSelected ? "opacity-50" : undefined
                  }
                />
              </TableHead>
              <TableHead>Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[60px] rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                </TableRow>
              ))
            ) : filteredQuotes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchQuery || statusFilter !== "all" ? "No quotes match your filters." : "No quotes found. Create one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredQuotes.map((quote) => {
                const isSelected = selectedIds.has(quote.id);
                return (
                  <TableRow
                    key={quote.id}
                    data-testid={`row-quote-${quote.id}`}
                    className={isSelected ? "bg-primary/5" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(quote.id)}
                        aria-label={`Select ${quote.quoteNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium font-mono">
                      {quote.quoteNumber}
                    </TableCell>
                    <TableCell>{quote.customerName}</TableCell>
                    <TableCell>
                      {format(new Date(quote.quoteDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(quote.validUntil), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="font-mono">
                      £
                      {quote.totalValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{statusChip(quote.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/quotes/${quote.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View"
                            data-testid={`button-view-quote-${quote.id}`}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/quotes/${quote.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            data-testid={`button-edit-quote-${quote.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Clone"
                          onClick={() => handleClone(quote.id)}
                          data-testid={`button-clone-quote-${quote.id}`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {deleteDialog(quote.id, quote.quoteNumber)}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Bulk confirm: delete ── */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} quote{selectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>You are about to permanently delete {selectedIds.size} record{selectedIds.size > 1 ? "s" : ""}. This cannot be undone.</p>
                {hasWonOrSent && (
                  <p className="text-amber-600 font-medium">
                    ⚠ Some selected quotes have already been sent or won.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkLoading ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk confirm: status ── */}
      <AlertDialog
        open={confirmStatus !== null}
        onOpenChange={(open) => { if (!open) setConfirmStatus(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark {selectedIds.size} quote{selectedIds.size > 1 ? "s" : ""} as {confirmStatus}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to update the status of {selectedIds.size} record{selectedIds.size > 1 ? "s" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmStatus && handleBulkStatus(confirmStatus)}
              disabled={isBulkLoading}
            >
              {isBulkLoading ? "Updating…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk action bar ── */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={clearSelection}
        actions={[
          {
            label: "Mark Sent",
            icon: <CheckCheck className="w-3.5 h-3.5" />,
            onClick: () => setConfirmStatus("Sent"),
          },
          {
            label: "Mark Won",
            icon: <Trophy className="w-3.5 h-3.5" />,
            onClick: () => setConfirmStatus("Won"),
          },
          {
            label: "Mark Lost",
            icon: <XCircle className="w-3.5 h-3.5" />,
            onClick: () => setConfirmStatus("Lost"),
          },
          {
            label: "Delete",
            icon: <Trash2 className="w-3.5 h-3.5" />,
            variant: "destructive",
            onClick: () => setConfirmDelete(true),
          },
        ]}
      />
    </div>
  );
}
