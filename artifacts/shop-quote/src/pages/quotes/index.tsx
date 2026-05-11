import { useListQuotes, useDeleteQuote, useDuplicateQuote, getListQuotesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, FileText, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

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
          toast({ title: "Quote deleted successfully" });
        },
        onError: () => {
          toast({ title: "Failed to delete quote", variant: "destructive" });
        }
      }
    );
  };

  const handleDuplicate = (id: number) => {
    duplicateQuote.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          toast({ title: "Quote duplicated successfully" });
        },
        onError: () => {
          toast({ title: "Failed to duplicate quote", variant: "destructive" });
        }
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft": return "bg-gray-100 text-gray-800 border-gray-200";
      case "Sent": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Won": return "bg-green-100 text-green-800 border-green-200";
      case "Lost": return "bg-red-100 text-red-800 border-red-200";
      case "Expired": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
        <Link href="/quotes/new">
          <Button data-testid="button-new-quote">
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </Link>
      </div>

      <div className="border rounded-md bg-card">
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
                  <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                  <TableCell>{quote.customerName}</TableCell>
                  <TableCell>{format(new Date(quote.quoteDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{format(new Date(quote.validUntil), 'dd MMM yyyy')}</TableCell>
                  <TableCell>£{quote.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(quote.status)}`}>
                      {quote.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/quotes/${quote.id}`}>
                        <Button variant="ghost" size="icon" title="View Quote" data-testid={`button-view-quote-${quote.id}`}>
                          <FileText className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/quotes/${quote.id}/edit`}>
                        <Button variant="ghost" size="icon" title="Edit Quote" data-testid={`button-edit-quote-${quote.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" title="Duplicate Quote" onClick={() => handleDuplicate(quote.id)} data-testid={`button-duplicate-quote-${quote.id}`}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive" title="Delete Quote" data-testid={`button-delete-quote-${quote.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {quote.quoteNumber}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(quote.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
