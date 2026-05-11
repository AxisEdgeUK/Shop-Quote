import { useListQuotes, useDeleteQuote, useDuplicateQuote, getListQuotesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, FileText, Copy, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  Draft:   { dot: "bg-zinc-400",    text: "text-zinc-600",    bg: "bg-zinc-100" },
  Sent:    { dot: "bg-blue-400",    text: "text-blue-700",    bg: "bg-blue-50" },
  Won:     { dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" },
  Lost:    { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50" },
  Expired: { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50" },
};

export function QuotesList() {
  const { data: quotes, isLoading } = useListQuotes();
  const deleteQuote = useDeleteQuote();
  const duplicateQuote = useDuplicateQuote();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      }
    );
  };

  const handleDuplicate = (id: number) => {
    duplicateQuote.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          toast({ title: "Quote duplicated" });
        },
        onError: () => {
          toast({ title: "Failed to duplicate quote", variant: "destructive" });
        },
      }
    );
  };

  const statusChip = (status: string) => {
    const sc = STATUS_COLORS[status] ?? STATUS_COLORS.Draft;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
        {status}
      </span>
    );
  };

  const deleteDialog = (id: number, quoteNumber: string) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive h-10 w-10" title="Delete" data-testid={`button-delete-quote-${id}`}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Quote</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {quoteNumber}? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleDelete(id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quotes</h1>
        <Link href="/quotes/new">
          <Button className="h-11 px-5" data-testid="button-new-quote">
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </Link>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : quotes?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No quotes yet. Create your first one.</p>
          </div>
        ) : (
          quotes?.map((quote) => {
            const sc = STATUS_COLORS[quote.status] ?? STATUS_COLORS.Draft;
            return (
              <div
                key={quote.id}
                className="rounded-xl border bg-card overflow-hidden"
                style={{ borderColor: "hsl(var(--card-border))" }}
                data-testid={`row-quote-${quote.id}`}
              >
                <Link href={`/quotes/${quote.id}`}>
                  <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold">{quote.quoteNumber}</span>
                        {statusChip(quote.status)}
                      </div>
                      <div className="font-semibold text-base mt-1 truncate">{quote.customerName}</div>
                      <div className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {format(new Date(quote.quoteDate), "dd MMM yyyy")} · valid until {format(new Date(quote.validUntil), "dd MMM yyyy")}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-lg">
                        £{quote.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <ChevronRight className="w-4 h-4 ml-auto mt-1 opacity-40" />
                    </div>
                  </div>
                </Link>
                <div
                  className="flex items-center gap-1 px-3 pb-3 pt-1 border-t"
                  style={{ borderColor: "hsl(var(--card-border))" }}
                >
                  <Link href={`/quotes/${quote.id}`}>
                    <Button variant="ghost" size="sm" className="h-10 px-3 text-xs gap-1.5" data-testid={`button-view-quote-${quote.id}`}>
                      <FileText className="w-3.5 h-3.5" /> View
                    </Button>
                  </Link>
                  <Link href={`/quotes/${quote.id}/edit`}>
                    <Button variant="ghost" size="sm" className="h-10 px-3 text-xs gap-1.5" data-testid={`button-edit-quote-${quote.id}`}>
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="h-10 px-3 text-xs gap-1.5" onClick={() => handleDuplicate(quote.id)} data-testid={`button-duplicate-quote-${quote.id}`}>
                    <Copy className="w-3.5 h-3.5" /> Copy
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
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[60px] rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                </TableRow>
              ))
            ) : quotes?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No quotes found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              quotes?.map((quote) => (
                <TableRow key={quote.id} data-testid={`row-quote-${quote.id}`}>
                  <TableCell className="font-medium font-mono">{quote.quoteNumber}</TableCell>
                  <TableCell>{quote.customerName}</TableCell>
                  <TableCell>{format(new Date(quote.quoteDate), "dd MMM yyyy")}</TableCell>
                  <TableCell>{format(new Date(quote.validUntil), "dd MMM yyyy")}</TableCell>
                  <TableCell className="font-mono">£{quote.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>{statusChip(quote.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/quotes/${quote.id}`}>
                        <Button variant="ghost" size="icon" title="View" data-testid={`button-view-quote-${quote.id}`}>
                          <FileText className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/quotes/${quote.id}/edit`}>
                        <Button variant="ghost" size="icon" title="Edit" data-testid={`button-edit-quote-${quote.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" title="Duplicate" onClick={() => handleDuplicate(quote.id)} data-testid={`button-duplicate-quote-${quote.id}`}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      {deleteDialog(quote.id, quote.quoteNumber)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
