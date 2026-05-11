import { useGetQuote, useUpdateQuote, getGetQuoteQueryKey, getListQuotesQueryKey } from "@workspace/api-client-react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { QuoteWizard, QuoteFormValues } from "@/components/quotes/quote-wizard";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EditQuote() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { data: quote, isLoading } = useGetQuote(id, { query: { enabled: !!id, queryKey: getGetQuoteQueryKey(id) } });
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
          setTimeout(() => {
            setLocation(`/quotes/${id}`);
          }, 1500);
        },
        onError: () => {
          toast({ title: "Failed to update quote", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) return <Skeleton className="h-[600px] w-full max-w-5xl mx-auto" />;
  if (!quote) return <div>Quote not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/quotes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Quote {quote.quoteNumber}</h1>
      </div>
      
      <div className="bg-background">
        <QuoteWizard 
          initialValues={quote}
          onSubmit={handleSubmit} 
          isSubmitting={updateQuote.isPending}
          savedQuoteId={id}
        />
      </div>
    </div>
  );
}
