import { useState } from "react";
import {
  useGetQuote,
  useGetCustomer,
  useGetSettings,
  useUpdateQuote,
  getGetQuoteQueryKey,
  getGetCustomerQueryKey,
  getListQuotesQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Edit,
  FileDown,
  Mail,
  Copy,
  Check,
  Lock,
  Eye,
  CopyPlus,
  Trophy,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { PrintLayout } from "@/components/quotes/print-layout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const { data: quote, isLoading: isLoadingQuote } = useGetQuote(id, {
    query: { enabled: !!id, queryKey: getGetQuoteQueryKey(id) },
  });
  const { data: customer, isLoading: isLoadingCustomer } = useGetCustomer(
    quote?.customerId || 0,
    {
      query: {
        enabled: !!quote?.customerId,
        queryKey: getGetCustomerQueryKey(quote?.customerId || 0),
      },
    },
  );
  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();
  const updateQuote = useUpdateQuote();

  const [emailCopied, setEmailCopied] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [lostNotes, setLostNotes] = useState("");
  const [showWonDialog, setShowWonDialog] = useState(false);
  const [wonPoNumber, setWonPoNumber] = useState("");
  const [wonExpectedDelivery, setWonExpectedDelivery] = useState("");
  const [wonNotesText, setWonNotesText] = useState("");
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const handlePrint = () => window.print();

  const handleMarkLost = () => {
    if (!quote) return;
    const today = new Date().toISOString().split("T")[0];
    updateQuote.mutate(
      {
        id: quote.id,
        data: { status: "Lost", lostReason, lostNotes, lostDate: today } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          toast({ title: "Quote marked as Lost" });
          setShowLostDialog(false);
          setLostReason("");
          setLostNotes("");
        },
        onError: () =>
          toast({ title: "Failed to update quote", variant: "destructive" }),
      },
    );
  };

  const handleMarkWon = () => {
    if (!quote) return;
    const today = new Date().toISOString().split("T")[0];
    updateQuote.mutate(
      {
        id: quote.id,
        data: {
          status: "Won",
          wonDate: today,
          wonNotes: wonNotesText,
          poNumber: wonPoNumber,
          expectedDelivery: wonExpectedDelivery,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          toast({ title: "Quote marked as Won" });
          setShowWonDialog(false);
          setWonPoNumber("");
          setWonExpectedDelivery("");
          setWonNotesText("");
        },
        onError: () =>
          toast({ title: "Failed to update quote", variant: "destructive" }),
      },
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
        onError: () =>
          toast({ title: "Failed to update quote", variant: "destructive" }),
      },
    );
  };

  const buildEmailBody = () => {
    if (!quote || !customer || !settings) return "";
    const partNames = quote.lineItems
      .filter((l) => !l.hiddenFromPdf)
      .map((l) => l.partName)
      .join(", ");
    const validity = quote.validUntil
      ? format(new Date(quote.validUntil), "dd MMM yyyy")
      : "";
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

  const handleEmail = () => {
    if (!quote || !customer) return;
    window.print();
    const subject = encodeURIComponent(`Quotation ${quote.quoteNumber} for ${customer.companyName}`);
    const body = encodeURIComponent(buildEmailBody());
    setTimeout(() => {
      window.location.href = `mailto:${customer.email}?subject=${subject}&body=${body}`;
    }, 500);
    toast({ title: "Save the PDF first", description: "Once saved, attach it to the email that opens." });
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
    Draft: "bg-gray-100 text-gray-700 border-gray-200",
    Sent: "bg-blue-100 text-blue-700 border-blue-200",
    Won: "bg-green-100 text-green-700 border-green-200",
    Lost: "bg-red-100 text-red-700 border-red-200",
    Expired: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <div className="max-w-5xl mx-auto pb-28 md:pb-6">
      {/* Premium command bar — desktop */}
      <div className="hidden md:flex items-center justify-between print:hidden mb-6 gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/quotes">
            <Button variant="ghost" size="icon" className="shrink-0 -ml-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold tracking-tight font-mono">
                {quote.quoteNumber}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold border shrink-0 ${statusColors[quote.status] ?? statusColors.Draft}`}
              >
                {quote.status}
              </span>
              {quote.lostReason && (
                <span className="text-xs text-muted-foreground italic truncate">
                  ({quote.lostReason})
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground leading-tight truncate">
              {customer.companyName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                More <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link
                  href={`/quotes/${quote.id}/edit`}
                  className="flex items-center gap-2 cursor-pointer w-full"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Quote
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/quotes/new?from=${quote.id}`}
                  className="flex items-center gap-2 cursor-pointer w-full"
                >
                  <CopyPlus className="w-3.5 h-3.5" /> Quote Similar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyEmail}>
                {emailCopied ? (
                  <Check className="w-3.5 h-3.5 mr-2 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 mr-2" />
                )}
                {emailCopied ? "Copied!" : "Copy Email Text"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                Update Status
              </DropdownMenuLabel>
              {quote.status === "Draft" && (
                <DropdownMenuItem onClick={handleMarkSent}>
                  <Lock className="w-3.5 h-3.5 mr-2" /> Mark Sent
                </DropdownMenuItem>
              )}
              {(quote.status === "Draft" || quote.status === "Sent") && (
                <DropdownMenuItem
                  onClick={() => setShowWonDialog(true)}
                  className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
                >
                  <Trophy className="w-3.5 h-3.5 mr-2" /> Mark Won
                </DropdownMenuItem>
              )}
              {(quote.status === "Draft" || quote.status === "Sent") && (
                <DropdownMenuItem
                  onClick={() => setShowLostDialog(true)}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  Mark Lost
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href={`/quotes/${quote.id}/present`}>
            <Button variant="outline" size="sm">
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Presentation
            </Button>
          </Link>

          {customer.email && (
            <Button variant="outline" size="sm" onClick={handleEmail}>
              <Mail className="w-3.5 h-3.5 mr-1.5" /> Send Email
            </Button>
          )}

          <Button onClick={handlePrint} size="sm" className="font-semibold gap-1.5">
            <FileDown className="w-4 h-4" /> Generate PDF
          </Button>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center gap-2.5 mb-4 print:hidden">
        <Link href="/quotes">
          <Button variant="ghost" size="icon" className="h-10 w-10 -ml-1 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight font-mono">
              {quote.quoteNumber}
            </h1>
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-semibold border shrink-0 ${statusColors[quote.status] ?? statusColors.Draft}`}
            >
              {quote.status}
            </span>
          </div>
          {customer.companyName && (
            <div className="text-sm truncate text-muted-foreground">
              {customer.companyName}
            </div>
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
        style={{
          background: "hsl(var(--background))",
          borderTop: "1px solid hsl(var(--border))",
        }}
      >
        <div
          className="flex gap-2 px-3 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
        >
          <Button
            className="flex-1 h-12 font-semibold gap-2"
            onClick={handlePrint}
          >
            <FileDown className="w-5 h-5" /> PDF
          </Button>
          {customer.email && (
            <Button
              variant="outline"
              className="flex-1 h-12 gap-2"
              onClick={handleEmail}
            >
              <Mail className="w-5 h-5" /> Email
            </Button>
          )}
          <Sheet open={showMoreSheet} onOpenChange={setShowMoreSheet}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-12 h-12 shrink-0" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader className="mb-4">
                <SheetTitle>More Actions</SheetTitle>
              </SheetHeader>
              <div className="space-y-2 pb-4">
                <Link
                  href={`/quotes/${quote.id}/present`}
                  onClick={() => setShowMoreSheet(false)}
                >
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-start gap-2"
                  >
                    <Eye className="w-4 h-4" /> Presentation
                  </Button>
                </Link>
                <Link
                  href={`/quotes/${quote.id}/edit`}
                  onClick={() => setShowMoreSheet(false)}
                >
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-start gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit Quote
                  </Button>
                </Link>
                <Link
                  href={`/quotes/new?from=${quote.id}`}
                  onClick={() => setShowMoreSheet(false)}
                >
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-start gap-2"
                  >
                    <CopyPlus className="w-4 h-4" /> Quote Similar
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full h-11 justify-start gap-2"
                  onClick={() => {
                    handleCopyEmail();
                    setShowMoreSheet(false);
                  }}
                >
                  <Copy className="w-4 h-4" /> Copy Email Text
                </Button>
                <div className="pt-1 border-t">
                  <p className="text-xs text-muted-foreground px-1 py-2 font-semibold uppercase tracking-wider">
                    Update Status
                  </p>
                </div>
                {quote.status === "Draft" && (
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-start gap-2"
                    onClick={() => {
                      handleMarkSent();
                      setShowMoreSheet(false);
                    }}
                  >
                    <Lock className="w-4 h-4" /> Mark Sent
                  </Button>
                )}
                {(quote.status === "Draft" || quote.status === "Sent") && (
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-start gap-2 text-emerald-600 border-emerald-200"
                    onClick={() => {
                      setShowWonDialog(true);
                      setShowMoreSheet(false);
                    }}
                  >
                    <Trophy className="w-4 h-4" /> Mark Won
                  </Button>
                )}
                {(quote.status === "Draft" || quote.status === "Sent") && (
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-start gap-2 text-red-600 border-red-200"
                    onClick={() => {
                      setShowLostDialog(true);
                      setShowMoreSheet(false);
                    }}
                  >
                    Mark Lost
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Lost reason dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Quote as Lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Reason for losing this quote</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger className="h-11 mt-1.5">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {LOST_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Additional notes</Label>
              <Textarea
                className="mt-1.5"
                placeholder="Any additional context about why this was lost..."
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLostDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleMarkLost}
              disabled={!lostReason || updateQuote.isPending}
            >
              Confirm Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Won dialog */}
      <Dialog open={showWonDialog} onOpenChange={setShowWonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-500" /> Mark Quote as Won
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>PO Number</Label>
              <Input
                className="mt-1.5"
                placeholder="e.g. PO-2024-0042"
                value={wonPoNumber}
                onChange={(e) => setWonPoNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>Expected Delivery</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={wonExpectedDelivery}
                onChange={(e) => setWonExpectedDelivery(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                className="mt-1.5"
                placeholder="Any notes about this order..."
                value={wonNotesText}
                onChange={(e) => setWonNotesText(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWonDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleMarkWon}
              disabled={updateQuote.isPending}
            >
              <Trophy className="w-4 h-4 mr-1.5" /> Confirm Won
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
