import { useState } from "react";
import { useCreateQuote, getListQuotesQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { QuoteWizard, QuoteFormValues } from "@/components/quotes/quote-wizard";
import { QuoteWorkspace } from "@/components/quotes/quote-workspace";

export function NewQuote() {
  const [, setLocation] = useLocation();
  const createQuote = useCreateQuote();
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

  return (
    <QuoteWorkspace title="New Quote" backHref="/quotes">
      <QuoteWizard
        onSubmit={handleSubmit}
        isSubmitting={createQuote.isPending}
        savedQuoteId={savedQuoteId}
      />
    </QuoteWorkspace>
  );
}
