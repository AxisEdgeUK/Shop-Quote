import { format } from "date-fns";
import { Quote, Customer, Settings } from "@workspace/api-client-react";

interface PrintLayoutProps {
  quote: Quote;
  customer: Customer;
  settings: Settings;
}

function calcPriceBreaks(
  item: Quote["lineItems"][0],
  qtys: number[],
  hourlyRate: number,
  setupRate: number
) {
  const setupCost = item.setupHours * setupRate;
  const programmingCost = item.programmingHours * hourlyRate;
  const inspectionCost = item.inspectionHours * hourlyRate;
  const tooling = item.toolingAllowance;
  const outside = item.outsideProcessing;
  const packaging = item.packaging;
  const delivery = item.delivery;
  const fixedCosts = setupCost + programmingCost + inspectionCost + tooling + outside + packaging + delivery;

  const machMinsPerPart = item.machiningMinutesPerPart;
  const deburrMinsPerPart = item.deburringMinutesPerPart;
  const matCostPerUnit = item.materialCostPerUnit;
  const wastage = item.materialWastagePercentage / 100;
  const risk = item.riskPercentage / 100;
  const margin = item.profitMarginPercentage / 100;
  const discount = (item.discountPercentage || 0) / 100;

  return qtys.map(qty => {
    const machCost = (machMinsPerPart / 60) * qty * hourlyRate;
    const deburrCost = (deburrMinsPerPart / 60) * qty * hourlyRate;
    const matCost = matCostPerUnit * qty * (1 + wastage);
    const directCost = fixedCosts + machCost + deburrCost + matCost;
    const riskVal = directCost * risk;
    const costBeforeMargin = directCost + riskVal;
    const preSell = margin >= 1 ? costBeforeMargin : costBeforeMargin / (1 - margin);
    const sell = discount > 0 ? preSell * (1 - discount) : preSell;
    const perPart = qty > 0 ? sell / qty : 0;
    return { qty, total: sell, perPart };
  });
}

export function PrintLayout({ quote, customer, settings }: PrintLayoutProps) {
  const cur = settings.currency === "GBP" ? "£" : settings.currency === "EUR" ? "€" : "$";

  // Filter hidden lines for customer view
  const visibleItems = quote.lineItems.filter(i => !i.hiddenFromPdf);
  const oneoffItems = visibleItems.filter(i => i.lineItemType === "oneoff");
  const standardItems = visibleItems.filter(i => i.lineItemType !== "oneoff");

  const subtotal = visibleItems.reduce((sum, item) => sum + (item.sellPrice || 0), 0);
  const vatTotal = visibleItems.reduce((sum, item) => sum + (item.vatAmount || 0), 0);
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

  // Price breaks
  const priceBreakQtys: number[] = (() => {
    if (!quote.priceBreakQtys) return [];
    try { return JSON.parse(quote.priceBreakQtys); } catch { return []; }
  })();

  const hourlyRate = settings.defaultHourlyRate || 65;
  const setupRate = settings.defaultSetupRate || 65;

  return (
    <div className="bg-white text-black font-sans w-full max-w-[816px] mx-auto">
      <div className="p-12 print:p-10">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-900">
          <div className="flex-1 pr-8">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.companyName} className="h-16 w-auto object-contain mb-2" crossOrigin="anonymous" />
            ) : (
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{settings.companyName || "YOUR COMPANY"}</h1>
            )}
            {settings.logoUrl && <div className="text-sm font-semibold text-gray-700 mt-1">{settings.companyName}</div>}
          </div>
          <div className="text-right min-w-[200px]">
            <div className="text-2xl font-bold tracking-wide text-gray-900 mb-3">QUOTATION</div>
            <table className="ml-auto text-sm">
              <tbody>
                <tr><td className="text-gray-500 pr-3 pb-1">Quote No.</td><td className="font-mono font-semibold pb-1">{quote.quoteNumber}</td></tr>
                <tr><td className="text-gray-500 pr-3 pb-1">Revision</td><td className="font-semibold pb-1">{quote.quoteRevision || "A"}</td></tr>
                <tr><td className="text-gray-500 pr-3 pb-1">Date</td><td className="pb-1">{formatDate(quote.quoteDate)}</td></tr>
                <tr><td className="text-gray-500 pr-3 pb-1">Valid Until</td><td className="pb-1">{formatDate(quote.validUntil)}</td></tr>
                {quote.leadTime && <tr><td className="text-gray-500 pr-3 pb-1">Lead Time</td><td className="pb-1 font-medium">{quote.leadTime}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── ADDRESSES ── */}
        <div className="flex justify-between mb-8 text-sm">
          <div className="w-5/12">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</div>
            <div className="font-bold text-base text-gray-900">{customer.companyName}</div>
            {customer.contactName && <div className="text-gray-600">Attn: {customer.contactName}</div>}
            {customer.address && <div className="text-gray-600 whitespace-pre-line mt-1">{customer.address}</div>}
            {customer.email && <div className="text-gray-500 mt-1">{customer.email}</div>}
          </div>
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
        <table className="w-full text-sm mb-6 border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="py-2 px-2 text-center font-bold w-10">Qty</th>
              <th className="py-2 px-2 text-left font-bold">Part Description</th>
              <th className="py-2 px-2 text-right font-bold w-28">Unit Price</th>
              <th className="py-2 px-2 text-right font-bold w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {standardItems.map((item, idx) => (
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

                  {/* Price break table inline under the part */}
                  {priceBreakQtys.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Quantity Price Breaks</div>
                      <table className="text-xs border border-gray-200 rounded overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-1 text-left font-semibold text-gray-500">Qty</th>
                            <th className="px-3 py-1 text-right font-semibold text-gray-500">Unit Price</th>
                            <th className="px-3 py-1 text-right font-semibold text-gray-500">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Always show the base quantity first */}
                          <tr className="bg-gray-100 font-semibold border-b border-gray-200">
                            <td className="px-3 py-1 font-mono">{item.quantity} <span className="text-gray-400 font-normal">(quoted)</span></td>
                            <td className="px-3 py-1 text-right font-mono">{cur}{(item.pricePerPart || 0).toFixed(2)}</td>
                            <td className="px-3 py-1 text-right font-mono">{cur}{(item.sellPrice || 0).toFixed(2)}</td>
                          </tr>
                          {calcPriceBreaks(item, priceBreakQtys.filter(q => q !== item.quantity), hourlyRate, setupRate).map(({ qty, total, perPart }) => (
                            <tr key={qty} className="border-b border-gray-100">
                              <td className="px-3 py-1 font-mono">{qty}</td>
                              <td className="px-3 py-1 text-right font-mono">{cur}{perPart.toFixed(2)}</td>
                              <td className="px-3 py-1 text-right font-mono">{cur}{total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </td>
                <td className="py-4 px-2 text-right align-top font-mono text-sm">
                  {priceBreakQtys.length > 0 ? "—" : `${cur}${(item.pricePerPart || 0).toFixed(2)}`}
                </td>
                <td className="py-4 px-2 text-right align-top font-mono font-semibold text-sm">
                  {cur}{(item.sellPrice || 0).toFixed(2)}
                </td>
              </tr>
            ))}

            {/* One-off charges section */}
            {oneoffItems.length > 0 && (
              <>
                <tr>
                  <td colSpan={4} className="pt-4 pb-1 px-2">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Additional Charges</div>
                  </td>
                </tr>
                {oneoffItems.map((item, idx) => (
                  <tr key={`oneoff-${item.id || idx}`} className="border-b border-gray-100">
                    <td className="py-2 px-2 text-center align-middle text-gray-400 text-xs">—</td>
                    <td className="py-2 px-2 align-middle">
                      <div className="font-medium text-gray-900">{item.partName}</div>
                    </td>
                    <td className="py-2 px-2 text-right align-middle font-mono text-sm">—</td>
                    <td className="py-2 px-2 text-right align-middle font-mono font-semibold text-sm">
                      {cur}{(item.sellPrice || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>

        {/* ── TOTALS + NOTES ── */}
        <div className="flex gap-12 justify-between">
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
