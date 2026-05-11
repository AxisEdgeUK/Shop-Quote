import { useState } from "react";
import { useGetQuote, useGetCustomer, useGetSettings, useUpdateQuote, getGetQuoteQueryKey, getGetCustomerQueryKey, getListQuotesQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, FileDown, Mail, Copy, Check, Lock, Share2 } from "lucide-react";
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

  const buildEmailBody = () => {
    if (!quote || !customer || !settings) return "";
    const partNames = quote.lineItems.filter(l => !l.hiddenFromPdf).map(l => l.partName).join(", ");
    const validity = quote.validUntil ? format(new Date(quote.validUntil), "dd MMM yyyy") : "";
    return `Dear ${customer.contactName || customer.companyName},

Please find attached our quotation ${quote.quoteNumber} (Rev ${quote.quoteRevision || "A"}) for: ${partNames}.

This quotation is valid until ${validity}.${quote.leadTime ? `\nLead time is estimated at ${quote.leadTime}.` : ""}${quote.deliveryTerms ? `\nDelivery: ${quote.deliveryTerms}.` : ""}${quote.paymentTerms ? `\nPayment terms: ${quote.paymentTerms}.` : ""}

Please do not hesitate to contact us if you have any questions or would like to proceed.

Kind regards,
${settings.companyName}${settings.phone ? `\n${settings.phone}` : ""}${settings.email ? `\n${settings.email}` : ""}`;
  };

  const buildEmailTemplate = () => {
    if (!quote || !customer || !settings) return "";
    return `Subject: Quotation ${quote.quoteNumber} for ${customer.companyName}\n\n${buildEmailBody()}`;
  };

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(buildEmailTemplate());
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2500);
  };

  const handleShare = async () => {
    const text = buildEmailBody();
    if (navigator.share) {
      try {
        await navigator.share({ title: `Quote ${quote?.quoteNumber}`, text });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Quote text copied to clipboard" });
    }
  };

  if (isLoadingQuote || isLoadingCustomer || isLoadingSettings) {
    return <Skeleton className="h-[800px] w-full max-w-4xl mx-auto" />;
  }

  if (!quote || !customer || !settings) return <div>Data not found</div>;

  const statusColors: Record<string, string> = {
    Draft:   "bg-gray-100 text-gray-700 border-gray-200",
    Sent:    "bg-blue-100 text-blue-700 border-blue-200",
    Won:     "bg-green-100 text-green-700 border-green-200",
    Lost:    "bg-red-100 text-red-700 border-red-200",
    Expired: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <div className="max-w-5xl mx-auto pb-28 md:pb-6">
      {/* Non-printable action bar — desktop */}
      <div className="hidden md:flex items-center justify-between print:hidden gap-3 flex-wrap mb-6">
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
          {customer.email && (
            <a
              href={`mailto:${customer.email}?subject=${encodeURIComponent(`Quotation ${quote.quoteNumber} for ${customer.companyName}`)}&body=${encodeURIComponent(buildEmailBody())}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm font-medium transition-colors hover:bg-muted"
              style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
            >
              <Mail className="w-3.5 h-3.5" /> Send Email
            </a>
          )}
          <Button variant="outline" size="sm" onClick={handleCopyEmail}>
            {emailCopied ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1.5" />Copy Email</>}
          </Button>
          <Link href={`/quotes/${quote.id}/edit`}>
            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-1.5" />Edit</Button>
          </Link>
          <Button onClick={handlePrint} size="sm">
            <FileDown className="w-4 h-4 mr-1.5" /> Generate PDF
          </Button>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center gap-3 mb-4 print:hidden">
        <Link href="/quotes">
          <Button variant="outline" size="icon" className="h-11 w-11"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold tracking-tight">{quote.quoteNumber}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColors[quote.status] ?? statusColors.Draft}`}>
              {quote.status}
            </span>
          </div>
          {quote.customerName && (
            <div className="text-sm truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{customer.companyName}</div>
          )}
        </div>
      </div>

      {/* Printable area */}
      <div className="bg-white text-black shadow-lg rounded-lg mx-auto overflow-hidden print:shadow-none print:rounded-none">
        <PrintLayout quote={quote} customer={customer} settings={settings} />
      </div>

      {/* Sticky mobile action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 print:hidden"
        style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="p-3 space-y-2">
          {/* Primary action */}
          <Button className="w-full h-12 text-base font-semibold gap-2" onClick={handlePrint}>
            <FileDown className="w-5 h-5" /> Generate PDF
          </Button>
          {/* Secondary row */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-11 gap-1.5" onClick={handleShare}>
              <Share2 className="w-4 h-4" /> Share Quote
            </Button>
            <Link href={`/quotes/${quote.id}/edit`} className="flex-1">
              <Button variant="outline" className="w-full h-11 gap-1.5">
                <Edit className="w-4 h-4" /> Edit
              </Button>
            </Link>
          </div>
          {/* Status actions */}
          <div className="flex gap-2">
            {quote.status === "Draft" && (
              <Button variant="outline" className="flex-1 h-11 gap-1.5 text-sm" onClick={handleMarkSent}>
                <Lock className="w-4 h-4" /> Mark Sent
              </Button>
            )}
            {(quote.status === "Draft" || quote.status === "Sent") && (
              <Button variant="outline" className="flex-1 h-11 text-sm text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowLostDialog(true)}>
                Mark Lost
              </Button>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}?subject=${encodeURIComponent(`Quotation ${quote.quoteNumber} for ${customer.companyName}`)}&body=${encodeURIComponent(buildEmailBody())}`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full h-11 gap-1.5 text-sm">
                  <Mail className="w-4 h-4" /> Email
                </Button>
              </a>
            )}
          </div>
        </div>
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
              <SelectTrigger className="h-11"><SelectValue placeholder="Select a reason" /></SelectTrigger>
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
