import { useState } from "react";
import {
  useGetQuote,
  useGetCustomer,
  useGetSettings,
  getGetQuoteQueryKey,
  getGetCustomerQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, FileDown, Eye } from "lucide-react";

const CUR = "£";

const COST_CHECKLIST = [
  "Material confirmed — grade and specification checked",
  "Quantities double-checked against drawing",
  "Tolerances reviewed — achievable on selected machine",
  "Lead time reviewed — realistic for current workload",
  "Margin is acceptable — no underpriced line items",
];

export function PresentQuote() {
  const params = useParams();
  const id = Number(params.id);

  const [showCostChecklist, setShowCostChecklist] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

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

  const handlePrint = () => {
    setCheckedItems(new Set());
    setShowCostChecklist(true);
  };

  const handleConfirmPrint = () => {
    setShowCostChecklist(false);
    window.print();
  };

  if (isLoadingQuote || isLoadingCustomer || isLoadingSettings) {
    return <Skeleton className="h-[800px] w-full max-w-4xl mx-auto" />;
  }

  if (!quote || !customer || !settings) {
    return <div>Data not found</div>;
  }

  const visibleItems = (quote.lineItems ?? []).filter((l) => !l.hiddenFromPdf);
  const totalValue = visibleItems.reduce(
    (sum, l) => sum + parseFloat(String(l.sellPrice || 0)),
    0,
  );

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Link href={`/quotes/${quote.id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <Eye className="w-4 h-4 text-primary" />
        <h1 className="font-semibold">Presentation View</h1>
        <span
          className="text-sm flex-1"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Customer-facing — internal costs hidden
        </span>
        <Button onClick={handlePrint} size="sm">
          <FileDown className="w-4 h-4 mr-1.5" /> Generate PDF
        </Button>
      </div>

      <div
        className="bg-white text-black shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none"
        style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
      >
        <div style={{ background: "#1D8FFF", height: 8 }} />

        <div
          className="px-10 pt-8 pb-6 border-b"
          style={{ borderColor: "#e5e7eb" }}
        >
          <div className="flex justify-between items-start">
            <div>
              {settings.companyName && (
                <div
                  className="text-2xl font-bold"
                  style={{ color: "#0D1117" }}
                >
                  {settings.companyName}
                </div>
              )}
              {settings.address && (
                <div className="text-sm mt-1" style={{ color: "#6b7280" }}>
                  {settings.address}
                </div>
              )}
              {settings.phone && (
                <div className="text-sm" style={{ color: "#6b7280" }}>
                  {settings.phone}
                </div>
              )}
              {settings.email && (
                <div className="text-sm" style={{ color: "#6b7280" }}>
                  {settings.email}
                </div>
              )}
            </div>
            <div className="text-right">
              <div
                className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded"
                style={{
                  background: "#0D1117",
                  color: "#ffffff",
                  letterSpacing: "0.12em",
                }}
              >
                QUOTATION
              </div>
              <div
                className="font-mono font-bold text-lg mt-2"
                style={{ color: "#0D1117" }}
              >
                {quote.quoteNumber}
              </div>
              <div className="text-sm mt-0.5" style={{ color: "#6b7280" }}>
                Rev {quote.quoteRevision || "A"}
              </div>
            </div>
          </div>
        </div>

        <div
          className="px-10 py-5 grid grid-cols-3 gap-6 border-b"
          style={{ borderColor: "#e5e7eb", background: "#fafafa" }}
        >
          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: "#9ca3af" }}
            >
              Customer
            </div>
            <div className="font-semibold" style={{ color: "#0D1117" }}>
              {customer.companyName}
            </div>
            {customer.contactName && (
              <div className="text-sm" style={{ color: "#6b7280" }}>
                Attn: {customer.contactName}
              </div>
            )}
            {customer.address && (
              <div className="text-sm mt-1" style={{ color: "#6b7280" }}>
                {customer.address}
              </div>
            )}
          </div>

          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-1"
              style={{ color: "#9ca3af" }}
            >
              Date
            </div>
            <div style={{ color: "#374151" }}>
              {quote.quoteDate ? fmtDate(quote.quoteDate) : ""}
            </div>
            {quote.validUntil && (
              <>
                <div
                  className="text-xs font-semibold uppercase tracking-wider mt-3 mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  Valid Until
                </div>
                <div style={{ color: "#374151" }}>
                  {fmtDate(quote.validUntil)}
                </div>
              </>
            )}
          </div>

          <div>
            {quote.leadTime && (
              <>
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  Lead Time
                </div>
                <div style={{ color: "#374151" }}>{quote.leadTime}</div>
              </>
            )}
            {quote.paymentTerms && (
              <>
                <div
                  className="text-xs font-semibold uppercase tracking-wider mt-3 mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  Payment
                </div>
                <div style={{ color: "#374151" }}>{quote.paymentTerms}</div>
              </>
            )}
            {quote.deliveryTerms && (
              <>
                <div
                  className="text-xs font-semibold uppercase tracking-wider mt-3 mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  Delivery
                </div>
                <div style={{ color: "#374151" }}>{quote.deliveryTerms}</div>
              </>
            )}
          </div>
        </div>

        <div className="px-10 py-6">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0D1117" }}>
                {[
                  "Part",
                  "Material",
                  "Process",
                  "Qty",
                  "Unit Price",
                  "Total",
                ].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: i >= 3 ? "right" : i === 3 ? "center" : "left",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase" as const,
                      color: "#ffffff",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td
                    style={{
                      padding: "14px 12px",
                      verticalAlign: "top",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#0D1117" }}>
                      {item.partName}
                    </div>
                    {item.drawingNumber && (
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>
                        Dwg: {item.drawingNumber}
                        {item.revision ? ` Rev ${item.revision}` : ""}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "14px 12px",
                      verticalAlign: "top",
                      color: "#374151",
                      fontSize: 13,
                    }}
                  >
                    {item.material || ""}
                  </td>
                  <td
                    style={{
                      padding: "14px 12px",
                      verticalAlign: "top",
                      color: "#374151",
                      fontSize: 13,
                    }}
                  >
                    {item.processType || ""}
                  </td>
                  <td
                    style={{
                      padding: "14px 12px",
                      textAlign: "right",
                      verticalAlign: "top",
                      color: "#374151",
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      padding: "14px 12px",
                      textAlign: "right",
                      verticalAlign: "top",
                      fontFamily: "monospace",
                      color: "#374151",
                      fontSize: 13,
                    }}
                  >
                    {CUR}
                    {parseFloat(String(item.pricePerPart || 0)).toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "14px 12px",
                      textAlign: "right",
                      verticalAlign: "top",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "#0D1117",
                      fontSize: 13,
                    }}
                  >
                    {CUR}
                    {parseFloat(String(item.sellPrice || 0)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#0D1117" }}>
                <td
                  colSpan={5}
                  style={{
                    padding: "12px 12px",
                    textAlign: "right",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#9ca3af",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                  }}
                >
                  Total (excl. VAT)
                </td>
                <td
                  style={{
                    padding: "12px 12px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontWeight: 800,
                    fontSize: 15,
                    color: "#ffffff",
                  }}
                >
                  {CUR}
                  {totalValue.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {(quote.notes || quote.termsAndConditions) && (
          <div className="px-10 pb-6 space-y-4">
            {quote.notes && (
              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: "#9ca3af" }}
                >
                  Notes
                </div>
                <div
                  className="text-sm"
                  style={{ color: "#374151", whiteSpace: "pre-wrap" }}
                >
                  {quote.notes}
                </div>
              </div>
            )}
            {quote.termsAndConditions && (
              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  Terms &amp; Conditions
                </div>
                <div
                  className="text-sm"
                  style={{ color: "#374151", whiteSpace: "pre-wrap" }}
                >
                  {quote.termsAndConditions}
                </div>
              </div>
            )}
          </div>
        )}

        <div
          className="px-10 py-4 border-t text-xs flex justify-between"
          style={{
            background: "#fafafa",
            borderColor: "#e5e7eb",
            color: "#9ca3af",
          }}
        >
          <span>
            This quotation is subject to our standard terms and conditions.
          </span>
          <span>{settings.companyName}</span>
        </div>
      </div>

      {/* Cost checklist dialog */}
      <Dialog open={showCostChecklist} onOpenChange={setShowCostChecklist}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pre-PDF Checklist</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Tick all items before generating the PDF.
            </p>
            {COST_CHECKLIST.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <Checkbox
                  id={`pchk-${i}`}
                  checked={checkedItems.has(i)}
                  onCheckedChange={(checked) => {
                    setCheckedItems((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(i);
                      else next.delete(i);
                      return next;
                    });
                  }}
                  className="mt-0.5"
                />
                <label
                  htmlFor={`pchk-${i}`}
                  className="text-sm cursor-pointer leading-snug"
                >
                  {item}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCostChecklist(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPrint}
              disabled={checkedItems.size < COST_CHECKLIST.length}
              className="gap-1.5"
            >
              Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
