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
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [pdfSaved, setPdfSaved] = useState(false);
  const [viewMode, setViewMode] = useState<"customer" | "internal">("customer");

  const handlePrint = () => window.print();

  const quoteWarnings = (() => {
    if (!quote || !customer) return [];
    const warns: string[] = [];
    if (!customer.email) warns.push("Customer has no email address.");
    if (!quote.leadTime) warns.push("Lead time not specified.");
    const items = (quote as any).lineItems ?? [];
    const hasNoMaterial = items.some((i: any) => !i.material);
    const hasNoMachine = items.some((i: any) => !i.machineId);
    const hasZeroSetup = items.some((i: any) => parseFloat(i.setupHours ?? "0") === 0 && parseFloat(i.quantity ?? "1") > 0);
    const hasLowMargin = items.some((i: any) => parseFloat(i.profitMarginPercentage ?? "0") < 10);
    if (hasNoMaterial) warns.push("One or more parts are missing a material.");
    if (hasNoMachine) warns.push("One or more parts have no machine assigned.");
    if (hasZeroSetup) warns.push("Setup time is zero on one or more parts — check this is intentional.");
    if (hasLowMargin) warns.push("Margin is below 10% on one or more parts.");
    return warns;
  })();

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
    setPdfSaved(false);
    setShowEmailDialog(true);
    setTimeout(() => window.print(), 100);
  };

  const handleOpenEmailDraft = () => {
    if (!quote || !customer) return;
    const subject = encodeURIComponent(
      `Quotation ${quote.quoteNumber} for ${customer.companyName}`,
    );
    const body = encodeURIComponent(buildEmailBody());
    window.location.href = `mailto:${customer.email}?subject=${subject}&body=${body}`;
    setShowEmailDialog(false);
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

          {/* Customer / Internal toggle */}
          <div className="flex rounded border overflow-hidden text-xs shrink-0">
            <button
              type="button"
              className={`px-3 py-1.5 transition-colors ${viewMode === "customer" ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted/50"}`}
              onClick={() => setViewMode("customer")}
            >
              Customer
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 border-l transition-colors ${viewMode === "internal" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted/50"}`}
              onClick={() => setViewMode("internal")}
            >
              Internal
              {quoteWarnings.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {quoteWarnings.length}
                </span>
              )}
            </button>
          </div>

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

      {/* Mobile view mode toggle */}
      <div className="md:hidden flex rounded border overflow-hidden text-sm mb-4 print:hidden">
        <button
          type="button"
          className={`flex-1 py-2.5 transition-colors font-medium ${viewMode === "customer" ? "bg-muted" : "text-muted-foreground"}`}
          onClick={() => setViewMode("customer")}
        >
          Customer View
        </button>
        <button
          type="button"
          className={`flex-1 py-2.5 border-l transition-colors font-medium ${viewMode === "internal" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setViewMode("internal")}
        >
          Internal View
          {quoteWarnings.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {quoteWarnings.length}
            </span>
          )}
        </button>
      </div>

      {/* Printable area — customer view */}
      {viewMode === "customer" && (
        <div className="bg-white text-black shadow-lg rounded-lg mx-auto overflow-hidden print:shadow-none print:rounded-none">
          <PrintLayout quote={quote} customer={customer} settings={settings} />
        </div>
      )}

      {/* Internal view */}
      {viewMode === "internal" && (
        <div className="space-y-4 print:hidden">

          {/* Quote health */}
          <div className={`rounded-lg border p-4 ${quoteWarnings.length > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${quoteWarnings.length > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                {quoteWarnings.length > 0 ? `⚠ ${quoteWarnings.length} item${quoteWarnings.length > 1 ? "s" : ""} to review` : "✓ Quote looks ready"}
              </span>
            </div>
            {quoteWarnings.length > 0 ? (
              <ul className="space-y-1">
                {quoteWarnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">·</span>{w}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-emerald-700">All checks passed. This quote is ready to send.</p>
            )}
          </div>

          {/* Cost breakdown per line item */}
          {((quote as any).lineItems ?? []).map((item: any, idx: number) => {
            const setupCost = parseFloat(item.setupCost ?? "0");
            const materialCostTotal = parseFloat(item.materialCostTotal ?? "0");
            const costBeforeMargin = parseFloat(item.costBeforeMargin ?? "0");
            const sellPrice = parseFloat(item.sellPrice ?? "0");
            const margin = parseFloat(item.profitMarginPercentage ?? "0");
            const machineHourlyRate = parseFloat(item.machineHourlyRate ?? settings.defaultHourlyRate ?? "65");
            const machineCost = costBeforeMargin - setupCost - materialCostTotal;
            const cur = settings.currency ?? "£";
            return (
              <div key={idx} className="rounded-lg border bg-card">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div>
                    <span className="font-semibold text-sm">{item.partName || `Part ${idx + 1}`}</span>
                    <span className="ml-2 text-xs text-muted-foreground font-mono">× {item.quantity}</span>
                    {item.material && <span className="ml-2 text-xs text-muted-foreground">{item.material}</span>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{cur}{sellPrice.toFixed(2)} total</div>
                    <div className="text-xs text-muted-foreground">{cur}{(item.pricePerPart ?? 0).toFixed(2)}/part</div>
                  </div>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Setup cost</span>
                    <span className="font-mono">{cur}{setupCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Material cost</span>
                    <span className="font-mono">{cur}{materialCostTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Machining cost</span>
                    <span className="font-mono">{cur}{machineCost > 0 ? machineCost.toFixed(2) : "0.00"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Machine rate</span>
                    <span className="font-mono">{cur}{machineHourlyRate.toFixed(2)}/hr</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="text-muted-foreground">Cost before margin</span>
                    <span className="font-mono">{cur}{costBeforeMargin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="text-muted-foreground font-medium">Margin</span>
                    <span className={`font-bold font-mono ${margin < 10 ? "text-red-600" : margin < 20 ? "text-amber-600" : "text-emerald-600"}`}>
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Totals summary */}
          {(() => {
            const items = (quote as any).lineItems ?? [];
            const totalCost = items.reduce((s: number, i: any) => s + parseFloat(i.costBeforeMargin ?? "0"), 0);
            const totalSell = items.reduce((s: number, i: any) => s + parseFloat(i.sellPrice ?? "0"), 0);
            const effectiveMargin = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0;
            const cur = settings.currency ?? "£";
            return (
              <div className="rounded-lg border bg-card px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Quote Totals</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Total cost</div>
                    <div className="font-bold font-mono">{cur}{totalCost.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Total sell</div>
                    <div className="font-bold font-mono">{cur}{totalSell.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Effective margin</div>
                    <div className={`font-bold font-mono ${effectiveMargin < 10 ? "text-red-600" : effectiveMargin < 20 ? "text-amber-600" : "text-emerald-600"}`}>
                      {effectiveMargin.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Internal notes */}
          {quote.internalNotes && (
            <div className="rounded-lg border bg-amber-50 border-amber-200 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Internal Notes</div>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{quote.internalNotes}</p>
            </div>
          )}
        </div>
      )}
    

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

      {/* Send Email dialog — two-step: save PDF then open email */}
      <Dialog
        open={showEmailDialog}
        onOpenChange={(open) => {
          setShowEmailDialog(open);
          if (!open) setPdfSaved(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4" /> Send Quote by Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Step 1 */}
            <div
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${pdfSaved ? "border-emerald-200 bg-emerald-50" : "border-border bg-muted/40"}`}
            >
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${pdfSaved ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"}`}
              >
                {pdfSaved ? <Check className="w-3.5 h-3.5" /> : "1"}
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="text-sm font-semibold leading-none">
                  Save the PDF
                </p>
                <p className="text-xs text-muted-foreground">
                  In the print dialog, choose{" "}
                  <strong>Save as PDF</strong> and save to your computer.
                </p>
                <Button
                  size="sm"
                  variant={pdfSaved ? "outline" : "default"}
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => {
                    window.print();
                    setTimeout(() => setPdfSaved(true), 800);
                  }}
                >
                  <FileDown className="w-3.5 h-3.5" />
                  {pdfSaved ? "Re-save PDF" : "Open Print Dialog"}
                </Button>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${!pdfSaved ? "opacity-50" : "border-border"}`}
            >
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${pdfSaved ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                2
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="text-sm font-semibold leading-none">
                  Open Email Draft
                </p>
                <p className="text-xs text-muted-foreground">
                  Opens your email client with the subject and body
                  pre-filled. Attach the saved PDF before sending.
                </p>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={!pdfSaved}
                  onClick={handleOpenEmailDraft}
                >
                  <Mail className="w-3.5 h-3.5" /> Open Email Draft
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
