import { useGetQuote, getGetQuoteQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { QuoteBuilder } from "@/components/quotes/quote-builder";
import { QuoteWorkspace } from "@/components/quotes/quote-workspace";
import { Skeleton } from "@/components/ui/skeleton";

export function EditQuote() {
  const params = useParams();
  const id = Number(params.id);
  const { data: quote, isLoading } = useGetQuote(id, {
    query: { enabled: !!id, queryKey: getGetQuoteQueryKey(id) },
  });

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (!quote) return <div>Quote not found</div>;

  return (
    <QuoteWorkspace
      title={`Edit ${quote.quoteNumber}`}
      backHref="/quotes"
      quoteId={id}
      initialNotes={quote.internalNotes}
    >
      <QuoteBuilder quoteId={id} initialQuote={quote} />
    </QuoteWorkspace>
  );
}
