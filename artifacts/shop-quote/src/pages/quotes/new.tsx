import { useCreateQuote, getListQuotesQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { QuoteWizard, QuoteFormValues } from "@/components/quotes/quote-wizard";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function NewQuote() {
  const [, setLocation] = useLocation();
  const createQuote = useCreateQuote();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (data: QuoteFormValues) => {
    // API expects structure matching QuoteInput
    createQuote.mutate(
      { data: data as any },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          toast({ title: "Quote generated successfully" });
          // Give the success screen a moment to show, then redirect to view
          setTimeout(() => {
            setLocation(`/quotes/${result.id}`);
          }, 1500);
        },
        onError: () => {
          toast({ title: "Failed to generate quote", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/quotes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">New Quote</h1>
      </div>
      
      <div className="bg-background">
        <QuoteWizard onSubmit={handleSubmit} isSubmitting={createQuote.isPending} />
      </div>
    </div>
  );
}
