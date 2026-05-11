import { format } from "date-fns";
import { Quote, Customer, Settings } from "@workspace/api-client-react";

interface PrintLayoutProps {
  quote: Quote;
  customer: Customer;
  settings: Settings;
}

function CurrencySymbol({ currency }: { currency: string }) {
  return <>{currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$"}</>;
}

export function PrintLayout({ quote, customer, settings }: PrintLayoutProps) {
  const cur = settings.currency === "GBP" ? "£" : settings.currency === "EUR" ? "€" : "$";

  const subtotal = quote.lineItems.reduce((sum, item) => sum + (item.sellPrice || 0), 0);
  const vatTotal = quote.lineItems.reduce((sum, item) => sum + (item.vatAmount || 0), 0);
  const grandTotal = subtotal + vatTotal;

  const hasCerts = quote.materialCertIncluded || quote.inspectionReportIncluded ||
    quote.fairIncluded || quote.cmmReportIncluded;

  const certList = [
    quote.materialCertIncluded && "Material Certificate",
    quote.inspectionReportIncluded && "Inspection Report",
    quote.fairIncluded && "FAIR",
    quote.cmmReportIncluded && "CMM Report",
  ].filter(Boolean).join(" · ");

  const formatDate = (d: string) => {
    try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
  };

  return (
    <div className="bg-white text-black font-sans w-full max-w-[816px] mx-auto">
      <div className="p-12 print:p-10">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-900">
          {/* Logo / Company name */}
          <div className="flex-1 pr-8">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.companyName}
                className="h-16 w-auto object-contain mb-2"
                crossOrigin="anonymous"
              />
            ) : (
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{settings.companyName || "YOUR COMPANY"}</h1>
            )}
            {settings.logoUrl && (
              <div className="text-sm font-semibold text-gray-700 mt-1">{settings.companyName}</div>
            )}
          </div>

          {/* Quote reference block */}
          <div className="text-right min-w-[200px]">
            <div className="text-2xl font-bold tracking-wide text-gray-900 mb-3">QUOTATION</div>
            <table className="ml-auto text-sm">
              <tbody>
                <tr>
                  <td className="text-gray-500 pr-3 pb-1">Quote No.</td>
                  <td className="font-mono font-semibold pb-1">{quote.quoteNumber}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 pr-3 pb-1">Revision</td>
                  <td className="font-semibold pb-1">{quote.quoteRevision || "A"}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 pr-3 pb-1">Date</td>
                  <td className="pb-1">{formatDate(quote.quoteDate)}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 pr-3 pb-1">Valid Until</td>
                  <td className="pb-1">{formatDate(quote.validUntil)}</td>
                </tr>
                {quote.leadTime && (
                  <tr>
                    <td className="text-gray-500 pr-3 pb-1">Lead Time</td>
                    <td className="pb-1 font-medium">{quote.leadTime}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── ADDRESSES ── */}
        <div className="flex justify-between mb-8 text-sm">
          {/* Bill To */}
          <div className="w-5/12">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</div>
            <div className="font-bold text-base text-gray-900">{customer.companyName}</div>
            {customer.contactName && <div className="text-gray-600">Attn: {customer.contactName}</div>}
            {customer.address && <div className="text-gray-600 whitespace-pre-line mt-1">{customer.address}</div>}
            {customer.email && <div className="text-gray-500 mt-1">{customer.email}</div>}
          </div>

          {/* From */}
          <div className="w-5/12 text-right">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">From</div>
            <div className="font-bold text-base text-gray-900">{settings.companyName}</div>
            {settings.address && <div className="text-gray-600 whitespace-pre-line mt-1">{settings.address}</div>}
            <div className="mt-1 text-gray-500 space-y-0.5">
              {settings.email && <div>{settings.email}</div>}
              {settings.phone && <div>{settings.phone}</div>}
              {settings.website && <div>{settings.website}</div>}
              {settings.vatNumber && <div>VAT: {settings.vatNumber}</div>}
            </div>
          </div>
        </div>

        {/* ── COMMERCIAL TERMS BAR ── */}
        {(quote.deliveryTerms || quote.paymentTerms || quote.leadTime) && (
          <div className="flex gap-0 mb-8 border border-gray-200 rounded overflow-hidden text-xs">
            {quote.deliveryTerms && (
              <div className="flex-1 px-4 py-2 border-r border-gray-200">
                <div className="text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Delivery</div>
                <div className="font-semibold text-gray-800">{quote.deliveryTerms}</div>
              </div>
            )}
            {quote.paymentTerms && (
              <div className="flex-1 px-4 py-2 border-r border-gray-200 last:border-r-0">
                <div className="text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Payment</div>
                <div className="font-semibold text-gray-800">{quote.paymentTerms}</div>
              </div>
            )}
            {quote.leadTime && (
              <div className="flex-1 px-4 py-2 last:border-r-0">
                <div className="text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Lead Time</div>
                <div className="font-semibold text-gray-800">{quote.leadTime}</div>
              </div>
            )}
          </div>
        )}

        {/* ── LINE ITEMS TABLE ── */}
        <table className="w-full text-sm mb-8 border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="py-2 px-2 text-left font-bold w-10 text-center">Qty</th>
              <th className="py-2 px-2 text-left font-bold">Part Description</th>
              <th className="py-2 px-2 text-right font-bold w-28">Unit Price</th>
              <th className="py-2 px-2 text-right font-bold w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.lineItems.map((item, idx) => (
              <tr key={item.id || idx} className="border-b border-gray-100">
                <td className="py-4 px-2 text-center align-top font-mono text-sm">{item.quantity}</td>
                <td className="py-4 px-2 align-top">
                  <div className="font-bold text-base text-gray-900">{item.partName}</div>
                  <div className="text-xs text-gray-500 mt-1.5 grid grid-cols-2 gap-x-6 gap-y-0.5">
                    {item.drawingNumber && (
                      <span><span className="text-gray-400">Dwg:</span> {item.drawingNumber}{item.revision ? ` Rev ${item.revision}` : ""}</span>
                    )}
                    {item.material && <span><span className="text-gray-400">Material:</span> {item.material}</span>}
                    {item.processType && <span><span className="text-gray-400">Process:</span> {item.processType}</span>}
                    {item.surfaceFinish && item.surfaceFinish !== "Standard" && <span><span className="text-gray-400">Finish:</span> {item.surfaceFinish}</span>}
                    {item.toleranceClass && item.toleranceClass !== "Standard" && <span><span className="text-gray-400">Tolerance:</span> {item.toleranceClass}</span>}
                  </div>
                </td>
                <td className="py-4 px-2 text-right align-top font-mono text-sm">
                  {cur}{(item.pricePerPart || 0).toFixed(2)}
                </td>
                <td className="py-4 px-2 text-right align-top font-mono font-semibold text-sm">
                  {cur}{(item.sellPrice || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── TOTALS + NOTES ── */}
        <div className="flex gap-12 justify-between">
          {/* Left: notes, certs */}
          <div className="flex-1 space-y-5 text-sm">
            {hasCerts && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Documentation Included</div>
                <div className="text-gray-700">{certList}</div>
              </div>
            )}
            {quote.notes && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Notes</div>
                <div className="text-gray-700 whitespace-pre-line">{quote.notes}</div>
              </div>
            )}
            {settings.showBankDetails && settings.bankName && (
              <div className="border border-gray-200 rounded p-4 bg-gray-50">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bank Details</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  <div><span className="text-gray-400">Bank:</span> {settings.bankName}</div>
                  <div><span className="text-gray-400">Account Name:</span> {settings.accountName}</div>
                  <div><span className="text-gray-400">Account No.:</span> {settings.accountNumber}</div>
                  <div><span className="text-gray-400">Sort Code:</span> {settings.sortCode}</div>
                  {settings.iban && <div className="col-span-2"><span className="text-gray-400">IBAN:</span> {settings.iban}</div>}
                  {settings.swiftBic && <div className="col-span-2"><span className="text-gray-400">SWIFT/BIC:</span> {settings.swiftBic}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Right: totals */}
          <div className="w-56 shrink-0">
            <div className="border-t-2 border-gray-900 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-mono">{cur}{subtotal.toFixed(2)}</span>
              </div>
              {vatTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">VAT</span>
                  <span className="font-mono">{cur}{vatTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t-2 border-gray-900 pt-3 mt-2">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-xl font-mono">{cur}{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── T&C ── */}
        {quote.termsAndConditions && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Terms & Conditions</div>
            <div className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{quote.termsAndConditions}</div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
          <span>{settings.companyName}{settings.vatNumber ? ` · VAT ${settings.vatNumber}` : ""}</span>
          <span>Quote {quote.quoteNumber} Rev {quote.quoteRevision || "A"}</span>
          {settings.website && <span>{settings.website}</span>}
        </div>
      </div>
    </div>
  );
}
