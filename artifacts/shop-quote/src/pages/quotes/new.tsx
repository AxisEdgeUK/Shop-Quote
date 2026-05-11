import { useState } from "react";
import { useCreateQuote, useListQuotes, getListQuotesQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { QuoteWizard, QuoteFormValues } from "@/components/quotes/quote-wizard";
import { ArrowLeft, Clock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export function NewQuote() {
  const [, setLocation] = useLocation();
  const createQuote = useCreateQuote();
  const { data: recentQuotes } = useListQuotes();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [savedQuoteId, setSavedQuoteId] = useState<number | undefined>();

  const handleSubmit = (data: QuoteFormValues) => {
    createQuote.mutate(
      { data: data as any },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          toast({ title: "Quote saved successfully" });
          setSavedQuoteId(result.id);
          setTimeout(() => setLocation(`/quotes/${result.id}`), 1500);
        },
        onError: () => {
          toast({ title: "Failed to save quote", variant: "destructive" });
        },
      }
    );
  };

  const last5 = recentQuotes?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/quotes">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">New Quote</h1>
      </div>

      {/* Similar / recent quotes intelligence panel */}
      {last5.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
            <Clock className="w-4 h-4" />
            Recent Quotes — for reference
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {last5.map(q => (
              <Link key={q.id} href={`/quotes/${q.id}`}>
                <div className="flex items-center justify-between p-2.5 bg-card border rounded-md hover:border-primary/40 transition-colors cursor-pointer text-sm">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-muted-foreground">{q.quoteNumber}</div>
                    <div className="font-medium truncate">{q.customerName}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(q.quoteDate), "dd MMM yyyy")}</div>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    <div className="font-semibold text-primary">£{q.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-0.5 ${
                      q.status === "Won" ? "bg-green-100 text-green-700" :
                      q.status === "Sent" ? "bg-blue-100 text-blue-700" :
                      q.status === "Lost" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                    }`}>{q.status}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Copy className="w-3 h-3" />
            Tip: Use the <strong>Duplicate</strong> button on the Quotes list to clone an existing quote and adjust quantities or material.
          </p>
        </div>
      )}

      <QuoteWizard onSubmit={handleSubmit} isSubmitting={createQuote.isPending} savedQuoteId={savedQuoteId} />
    </div>
  );
}
