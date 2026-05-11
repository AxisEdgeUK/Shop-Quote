import { useState } from "react";
import { useGetQuote, useGetCustomer, useGetSettings, useUpdateQuote, getGetQuoteQueryKey, getGetCustomerQueryKey, getListQuotesQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, FileDown, Mail, Copy, Check, Lock } from "lucide-react";
import { format } from "date-fns";
import { PrintLayout } from "@/components/quotes/print-layout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const LOST_REASONS = [
  "Price too high",
  "Lead time too long",
  "No response from customer",
  "Customer changed design",
  "Competitor won the job",
  "Job cancelled",
  "Other",
];

export function ViewQuote() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quote, isLoading: isLoadingQuote } = useGetQuote(id, { query: { enabled: !!id, queryKey: getGetQuoteQueryKey(id) } });
  const { data: customer, isLoading: isLoadingCustomer } = useGetCustomer(quote?.customerId || 0, { query: { enabled: !!quote?.customerId, queryKey: getGetCustomerQueryKey(quote?.customerId || 0) } });
  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();
  const updateQuote = useUpdateQuote();

  const [emailCopied, setEmailCopied] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const handlePrint = () => window.print();

  const handleMarkLost = () => {
    if (!quote) return;
    updateQuote.mutate(
      { id: quote.id, data: { status: "Lost", lostReason } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          toast({ title: "Quote marked as Lost" });
          setShowLostDialog(false);
        },
        onError: () => toast({ title: "Failed to update quote", variant: "destructive" }),
      }
    );
  };

  const handleMarkSent = () => {
    if (!quote) return;
    updateQuote.mutate(
      { id: quote.id, data: { status: "Sent" } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          toast({ title: "Quote marked as Sent" });
        },
        onError: () => toast({ title: "Failed to update quote", variant: "destructive" }),
      }
    );
  };

  const buildEmailTemplate = () => {
    if (!quote || !customer || !settings) return "";
    const partNames = quote.lineItems.filter(l => !l.hiddenFromPdf).map(l => l.partName).join(", ");
    const validity = quote.validUntil ? format(new Date(quote.validUntil), "dd MMM yyyy") : "";
    return `Subject: Quotation ${quote.quoteNumber} – ${customer.companyName}

Dear ${customer.contactName || customer.companyName},

Please find attached our quotation ${quote.quoteNumber} (Rev ${quote.quoteRevision || "A"}) for: ${partNames}.

This quotation is valid until ${validity}.${quote.leadTime ? `\nLead time is estimated at ${quote.leadTime}.` : ""}${quote.deliveryTerms ? `\nDelivery: ${quote.deliveryTerms}.` : ""}${quote.paymentTerms ? `\nPayment terms: ${quote.paymentTerms}.` : ""}

Please do not hesitate to contact us if you have any questions or would like to proceed.

Kind regards,
${settings.companyName}${settings.phone ? `\n${settings.phone}` : ""}${settings.email ? `\n${settings.email}` : ""}`;
  };

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(buildEmailTemplate());
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2500);
  };

  if (isLoadingQuote || isLoadingCustomer || isLoadingSettings) {
    return <Skeleton className="h-[800px] w-full max-w-4xl mx-auto" />;
  }

  if (!quote || !customer || !settings) return <div>Data not found</div>;

  const statusColors: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-700 border-gray-200",
    Sent: "bg-blue-100 text-blue-700 border-blue-200",
    Won: "bg-green-100 text-green-700 border-green-200",
    Lost: "bg-red-100 text-red-700 border-red-200",
    Expired: "bg-orange-100 text-orange-700 border-orange-200",
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Non-printable action bar */}
      <div className="flex items-center justify-between print:hidden gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/quotes">
            <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Quote {quote.quoteNumber}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[quote.status] ?? statusColors.Draft}`}>
            {quote.status}
          </span>
          {quote.lostReason && (
            <span className="text-xs text-muted-foreground italic">({quote.lostReason})</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick status actions */}
          {quote.status === "Draft" && (
            <Button variant="outline" size="sm" onClick={handleMarkSent}>
              <Lock className="w-3.5 h-3.5 mr-1.5" /> Mark Sent
            </Button>
          )}
          {(quote.status === "Draft" || quote.status === "Sent") && (
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowLostDialog(true)}>
              Mark Lost
            </Button>
          )}
          {/* Email template */}
          <Button variant="outline" size="sm" onClick={handleCopyEmail}>
            {emailCopied ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />Copied!</> : <><Mail className="w-3.5 h-3.5 mr-1.5" />Copy Email</>}
          </Button>
          <Link href={`/quotes/${quote.id}/edit`}>
            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-1.5" />Edit</Button>
          </Link>
          <Button onClick={handlePrint} size="sm">
            <FileDown className="w-4 h-4 mr-1.5" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Printable area */}
      <div className="bg-white text-black shadow-lg rounded-lg mx-auto overflow-hidden print:shadow-none print:rounded-none">
        <PrintLayout quote={quote} customer={customer} settings={settings} />
      </div>

      {/* Lost reason dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Quote as Lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason for losing this quote</Label>
            <Select value={lostReason} onValueChange={setLostReason}>
              <SelectTrigger><SelectValue placeholder="Select a reason…" /></SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLostDialog(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleMarkLost} disabled={!lostReason || updateQuote.isPending}>
              Confirm Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
