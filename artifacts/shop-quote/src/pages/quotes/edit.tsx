import {
  useGetQuote,
  useUpdateQuote,
  getGetQuoteQueryKey,
  getListQuotesQueryKey,
} from "@workspace/api-client-react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { QuoteWizard, QuoteFormValues } from "@/components/quotes/quote-wizard";
import { QuoteWorkspace } from "@/components/quotes/quote-workspace";
import { Skeleton } from "@/components/ui/skeleton";

export function EditQuote() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { data: quote, isLoading } = useGetQuote(id, {
    query: { enabled: !!id, queryKey: getGetQuoteQueryKey(id) },
  });
  const updateQuote = useUpdateQuote();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (data: QuoteFormValues) => {
    updateQuote.mutate(
      { id, data: data as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          toast({ title: "Quote updated successfully" });
          setTimeout(() => setLocation(`/quotes/${id}`), 1500);
        },
        onError: () => {
          toast({ title: "Failed to update quote", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (!quote) return <div>Quote not found</div>;

  return (
    <QuoteWorkspace
      title={`Edit ${quote.quoteNumber}`}
      backHref="/quotes"
      quoteId={id}
    >
      <QuoteWizard
        initialValues={quote}
        onSubmit={handleSubmit}
        isSubmitting={updateQuote.isPending}
        savedQuoteId={id}
      />
    </QuoteWorkspace>
  );
}
