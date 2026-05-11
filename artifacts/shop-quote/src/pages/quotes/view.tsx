import { useGetQuote, useGetCustomer, useGetSettings, getGetQuoteQueryKey, getGetCustomerQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, FileDown } from "lucide-react";
import { format } from "date-fns";
import { PrintLayout } from "@/components/quotes/print-layout";

export function ViewQuote() {
  const params = useParams();
  const id = Number(params.id);
  
  const { data: quote, isLoading: isLoadingQuote } = useGetQuote(id, { query: { enabled: !!id, queryKey: getGetQuoteQueryKey(id) } });
  const { data: customer, isLoading: isLoadingCustomer } = useGetCustomer(quote?.customerId || 0, { query: { enabled: !!quote?.customerId, queryKey: getGetCustomerQueryKey(quote?.customerId || 0) } });
  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();

  const handlePrint = () => {
    window.print();
  };

  if (isLoadingQuote || isLoadingCustomer || isLoadingSettings) {
    return <Skeleton className="h-[800px] w-full max-w-4xl mx-auto" />;
  }

  if (!quote || !customer || !settings) return <div>Data not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Non-printable action bar */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/quotes">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Quote {quote.quoteNumber}</h1>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            {quote.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/quotes/${quote.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
          </Link>
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground">
            <FileDown className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Printable Area - We use a specialized component for the print layout */}
      <div className="bg-white text-black shadow-lg rounded-lg mx-auto overflow-hidden print:shadow-none print:rounded-none">
        <PrintLayout quote={quote} customer={customer} settings={settings} />
      </div>
    </div>
  );
}
