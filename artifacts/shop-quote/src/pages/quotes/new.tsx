import { useState } from "react";
import { useGetQuote, getGetQuoteQueryKey } from "@workspace/api-client-react";
import { useSearch } from "wouter";
import { QuoteBuilder } from "@/components/quotes/quote-builder";
import { QuoteWorkspace } from "@/components/quotes/quote-workspace";
import { Skeleton } from "@/components/ui/skeleton";

export function NewQuote() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const fromId = params.get("from") ? Number(params.get("from")) : null;

  // The draft is created automatically by QuoteBuilder once a customer is picked;
  // we hold its id here so the Job File (drawing + notes) can persist against it.
  const [draftId, setDraftId] = useState<number | undefined>();

  const { data: sourceQuote, isLoading: isLoadingSource } = useGetQuote(
    fromId ?? 0,
    {
      query: {
        enabled: !!fromId,
        queryKey: getGetQuoteQueryKey(fromId ?? 0),
      },
    },
  );

  if (fromId && isLoadingSource) {
    return (
      <div className="max-w-2xl mx-auto mt-8 space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  const title = fromId ? "Quote Similar Job" : "New Quote";

  return (
    <QuoteWorkspace title={title} backHref="/quotes" quoteId={draftId} initialNotes="">
      <QuoteBuilder
        quoteId={draftId}
        initialQuote={fromId ? sourceQuote : undefined}
        onQuoteCreated={setDraftId}
      />
    </QuoteWorkspace>
  );
}
