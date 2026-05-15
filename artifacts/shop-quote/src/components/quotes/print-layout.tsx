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
  setupRate: number,
  machineHourlyRate: number,
) {
  const setupCost = item.setupHours * setupRate;
  const programmingCost = item.programmingHours * hourlyRate;
  const inspectionCost = item.inspectionHours * hourlyRate;
  const tooling = item.toolingAllowance;
  const outside = item.outsideProcessing;
  const packaging = item.packaging;
  const delivery = item.delivery;
  const fixedCosts =
    setupCost +
    programmingCost +
    inspectionCost +
    tooling +
    outside +
    packaging +
    delivery;

  const machMinsPerPart = item.machiningMinutesPerPart;
  const deburrMinsPerPart = item.deburringMinutesPerPart;
  const matCostPerUnit = item.materialCostPerUnit;
  const wastage = item.materialWastagePercentage / 100;
  const risk = item.riskPercentage / 100;
  const margin = item.profitMarginPercentage / 100;
  const discount = (item.discountPercentage || 0) / 100;

  return qtys.map((qty) => {
    const machCost = (machMinsPerPart / 60) * qty * machineHourlyRate;
    const deburrCost = (deburrMinsPerPart / 60) * qty * hourlyRate;
    const matCost = matCostPerUnit * qty * (1 + wastage);
    const directCost = fixedCosts + machCost + deburrCost + matCost;
    const riskVal = directCost * risk;
    const costBeforeMargin = directCost + riskVal;
    const preSell =
      margin >= 1 ? costBeforeMargin : costBeforeMargin / (1 - margin);
    const sell = discount > 0 ? preSell * (1 - discount) : preSell;
    const perPart = qty > 0 ? sell / qty : 0;
    return { qty, total: sell, perPart };
  });
}

export function PrintLayout({ quote, customer, settings }: PrintLayoutProps) {
  const cur =
    settings.currency === "GBP" ? "£" : settings.currency === "EUR" ? "€" : "$";

  const visibleItems = quote.lineItems.filter((i) => !i.hiddenFromPdf);
  const oneoffItems = visibleItems.filter((i) => i.lineItemType === "oneoff");
  const standardItems = visibleItems.filter((i) => i.lineItemType !== "oneoff");

  const subtotal = visibleItems.reduce(
    (sum, item) => sum + (item.sellPrice || 0),
    0,
  );
  const vatTotal = visibleItems.reduce(
    (sum, item) => sum + (item.vatAmount || 0),
    0,
  );
  const grandTotal = subtotal + vatTotal;

  const hasCerts =
    quote.materialCertIncluded ||
    quote.inspectionReportIncluded ||
    quote.fairIncluded ||
    quote.cmmReportIncluded;

  const certList = [
    quote.materialCertIncluded && "Material Certificate",
    quote.inspectionReportIncluded && "Inspection Report",
    quote.fairIncluded && "FAIR",
    quote.cmmReportIncluded && "CMM Report",
  ]
    .filter(Boolean)
    .join(" · ");

  const formatDate = (d: string) => {
    try {
      return format(new Date(d), "dd MMM yyyy");
    } catch {
      return d;
    }
  };

  const priceBreakQtys: number[] = (() => {
    if (!quote.priceBreakQtys) return [];
    try {
      return JSON.parse(quote.priceBreakQtys);
    } catch {
      return [];
    }
  })();

  const defaultHourlyRate = settings.defaultHourlyRate || 65;
  const defaultSetupRate = settings.defaultSetupRate || 65;

  return (
    <div
      className="bg-white text-black font-sans w-full max-w-[816px] mx-auto"
      style={{ borderTop: "4px solid #1D8FFF" }}
    >
      <div className="p-12 print:p-10">
        {/* ── HEADER ── */}
        <div
          className="flex justify-between items-start mb-8 pb-6"
          style={{ borderBottom: "2px solid #111827" }}
        >
          <div className="flex-1 pr-8">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.companyName}
                className="h-16 w-auto object-contain mb-2"
                crossOrigin="anonymous"
              />
            ) : (
              <h1
                className="text-3xl font-extrabold tracking-tight"
                style={{ color: "#0D1117" }}
              >
                {settings.companyName || "YOUR COMPANY"}
              </h1>
            )}
            {settings.logoUrl && (
              <div
                className="text-sm font-semibold mt-1"
                style={{ color: "#374151" }}
              >
                {settings.companyName}
              </div>
            )}
          </div>
          <div className="text-right min-w-[200px]">
            <div
              className="inline-block px-4 py-1.5 mb-3 text-sm font-bold tracking-[0.18em] uppercase"
              style={{
                background: "#111827",
                color: "#ffffff",
                letterSpacing: "0.18em",
              }}
            >
              QUOTATION
            </div>
            <table className="ml-auto text-sm">
              <tbody>
                <tr>
                  <td className="text-gray-500 pr-3 pb-1 text-right">
                    Quote No.
                  </td>
                  <td
                    className="font-mono font-bold pb-1 text-right"
                    style={{ color: "#1D8FFF" }}
                  >
                    {quote.quoteNumber}
                  </td>
                </tr>
                <tr>
                  <td className="text-gray-500 pr-3 pb-1 text-right">
                    Revision
                  </td>
                  <td className="font-semibold pb-1 text-right">
                    {quote.quoteRevision || "A"}
                  </td>
                </tr>
                <tr>
                  <td className="text-gray-500 pr-3 pb-1 text-right">Date</td>
                  <td className="pb-1 text-right">
                    {formatDate(quote.quoteDate)}
                  </td>
                </tr>
                <tr>
                  <td className="text-gray-500 pr-3 pb-1 text-right">
                    Valid Until
                  </td>
                  <td className="pb-1 text-right font-medium">
                    {formatDate(quote.validUntil)}
                  </td>
                </tr>
                {quote.leadTime && (
                  <tr>
                    <td className="text-gray-500 pr-3 pb-1 text-right">
                      Lead Time
                    </td>
                    <td className="pb-1 text-right font-medium">
                      {quote.leadTime}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── ADDRESSES ── */}
        <div className="flex justify-between mb-8 text-sm">
          <div className="w-5/12">
            <div
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "#9ca3af" }}
            >
              Bill To
            </div>
            <div className="font-bold text-base" style={{ color: "#0D1117" }}>
              {customer.companyName}
            </div>
            {customer.contactName && (
              <div style={{ color: "#4b5563" }}>
                Attn: {customer.contactName}
              </div>
            )}
            {customer.address && (
              <div
                className="whitespace-pre-line mt-1"
                style={{ color: "#4b5563" }}
              >
                {customer.address}
              </div>
            )}
            {customer.email && (
              <div className="mt-1" style={{ color: "#6b7280" }}>
                {customer.email}
              </div>
            )}
          </div>
          <div className="w-5/12 text-right">
            <div
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "#9ca3af" }}
            >
              From
            </div>
            <div className="font-bold text-base" style={{ color: "#0D1117" }}>
              {settings.companyName}
            </div>
            {settings.address && (
              <div
                className="whitespace-pre-line mt-1"
                style={{ color: "#4b5563" }}
              >
                {settings.address}
              </div>
            )}
            <div className="mt-1 space-y-0.5" style={{ color: "#6b7280" }}>
              {settings.email && <div>{settings.email}</div>}
              {settings.phone && <div>{settings.phone}</div>}
              {settings.website && <div>{settings.website}</div>}
              {settings.vatNumber && <div>VAT: {settings.vatNumber}</div>}
            </div>
          </div>
        </div>

        {/* ── COMMERCIAL TERMS BAR ── */}
        {(quote.deliveryTerms || quote.paymentTerms || quote.leadTime) && (
          <div
            className="flex gap-0 mb-8 overflow-hidden text-xs"
            style={{ border: "1px solid #e5e7eb" }}
          >
            {quote.deliveryTerms && (
              <div
                className="flex-1 px-4 py-2.5"
                style={{ borderRight: "1px solid #e5e7eb" }}
              >
                <div
                  className="uppercase tracking-wider font-semibold mb-0.5"
                  style={{ color: "#9ca3af", fontSize: 9 }}
                >
                  Delivery
                </div>
                <div className="font-semibold" style={{ color: "#1f2937" }}>
                  {quote.deliveryTerms}
                </div>
              </div>
            )}
            {quote.paymentTerms && (
              <div
                className="flex-1 px-4 py-2.5"
                style={{
                  borderRight: quote.leadTime ? "1px solid #e5e7eb" : "none",
                }}
              >
                <div
                  className="uppercase tracking-wider font-semibold mb-0.5"
                  style={{ color: "#9ca3af", fontSize: 9 }}
                >
                  Payment
                </div>
                <div className="font-semibold" style={{ color: "#1f2937" }}>
                  {quote.paymentTerms}
                </div>
              </div>
            )}
            {quote.leadTime && (
              <div className="flex-1 px-4 py-2.5">
                <div
                  className="uppercase tracking-wider font-semibold mb-0.5"
                  style={{ color: "#9ca3af", fontSize: 9 }}
                >
                  Lead Time
                </div>
                <div className="font-semibold" style={{ color: "#1f2937" }}>
                  {quote.leadTime}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LINE ITEMS TABLE ── */}
        <table className="w-full text-sm mb-6 border-collapse">
          <thead>
            <tr style={{ background: "#111827" }}>
              <th
                className="py-2.5 px-3 text-center font-semibold w-12"
                style={{
                  color: "#e5e7eb",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                }}
              >
                QTY
              </th>
              <th
                className="py-2.5 px-3 text-left font-semibold"
                style={{
                  color: "#e5e7eb",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                }}
              >
                PART DESCRIPTION
              </th>
              <th
                className="py-2.5 px-3 text-right font-semibold w-28"
                style={{
                  color: "#e5e7eb",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                }}
              >
                UNIT PRICE
              </th>
              <th
                className="py-2.5 px-3 text-right font-semibold w-32"
                style={{
                  color: "#e5e7eb",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                }}
              >
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {standardItems.map((item, idx) => (
              <tr
                key={item.id || idx}
                style={{ borderBottom: "1px solid #f3f4f6" }}
              >
                <td
                  className="py-4 px-3 text-center align-top font-mono text-sm font-semibold"
                  style={{ color: "#374151" }}
                >
                  {item.quantity}
                </td>
                <td className="py-4 px-3 align-top">
                  <div
                    className="font-bold text-base"
                    style={{ color: "#0D1117" }}
                  >
                    {item.partName}
                  </div>
                  <div
                    className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-0.5"
                    style={{ fontSize: 11, color: "#6b7280" }}
                  >
                    {item.drawingNumber && (
                      <span>
                        <span style={{ color: "#9ca3af" }}>Dwg:</span>{" "}
                        {item.drawingNumber}
                        {item.revision ? ` Rev ${item.revision}` : ""}
                      </span>
                    )}
                    {item.material && (
                      <span>
                        <span style={{ color: "#9ca3af" }}>Material:</span>{" "}
                        {item.material}
                      </span>
                    )}
                    {item.processType && (
                      <span>
                        <span style={{ color: "#9ca3af" }}>Process:</span>{" "}
                        {item.processType}
                      </span>
                    )}
                    {item.surfaceFinish &&
                      item.surfaceFinish !== "Standard" && (
                        <span>
                          <span style={{ color: "#9ca3af" }}>Finish:</span>{" "}
                          {item.surfaceFinish}
                        </span>
                      )}
                    {item.toleranceClass &&
                      item.toleranceClass !== "Standard" && (
                        <span>
                          <span style={{ color: "#9ca3af" }}>Tolerance:</span>{" "}
                          {item.toleranceClass}
                        </span>
                      )}
                  </div>

                  {priceBreakQtys.length > 0 && (
                    <div className="mt-3">
                      <div
                        className="font-semibold uppercase tracking-wider mb-1"
                        style={{
                          fontSize: 9,
                          color: "#9ca3af",
                          letterSpacing: "0.14em",
                        }}
                      >
                        Quantity Price Breaks
                      </div>
                      <table
                        className="text-xs overflow-hidden"
                        style={{ border: "1px solid #e5e7eb" }}
                      >
                        <thead>
                          <tr style={{ background: "#f9fafb" }}>
                            <th
                              className="px-3 py-1 text-left font-semibold"
                              style={{ color: "#6b7280" }}
                            >
                              Qty
                            </th>
                            <th
                              className="px-3 py-1 text-right font-semibold"
                              style={{ color: "#6b7280" }}
                            >
                              Unit Price
                            </th>
                            <th
                              className="px-3 py-1 text-right font-semibold"
                              style={{ color: "#6b7280" }}
                            >
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            className="font-semibold"
                            style={{
                              background: "#f3f4f6",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            <td className="px-3 py-1 font-mono">
                              {item.quantity}{" "}
                              <span
                                style={{ color: "#9ca3af", fontWeight: 400 }}
                              >
                                (quoted)
                              </span>
                            </td>
                            <td className="px-3 py-1 text-right font-mono">
                              {cur}
                              {(item.pricePerPart || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-1 text-right font-mono">
                              {cur}
                              {(item.sellPrice || 0).toFixed(2)}
                            </td>
                          </tr>
                          {calcPriceBreaks(
                            item,
                            priceBreakQtys.filter((q) => q !== item.quantity),
                            defaultHourlyRate,
                            defaultSetupRate,
                            (item as any).machineHourlyRate ||
                              defaultHourlyRate,
                          ).map(({ qty, total, perPart }) => (
                            <tr
                              key={qty}
                              style={{ borderBottom: "1px solid #f3f4f6" }}
                            >
                              <td className="px-3 py-1 font-mono">{qty}</td>
                              <td className="px-3 py-1 text-right font-mono">
                                {cur}
                                {perPart.toFixed(2)}
                              </td>
                              <td className="px-3 py-1 text-right font-mono">
                                {cur}
                                {total.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </td>
                <td
                  className="py-4 px-3 text-right align-top font-mono text-sm"
                  style={{ color: "#374151" }}
                >
                  {priceBreakQtys.length > 0
                    ? "-"
                    : `${cur}${(item.pricePerPart || 0).toFixed(2)}`}
                </td>
                <td
                  className="py-4 px-3 text-right align-top font-mono font-bold text-sm"
                  style={{ color: "#0D1117" }}
                >
                  {cur}
                  {(item.sellPrice || 0).toFixed(2)}
                </td>
              </tr>
            ))}

            {oneoffItems.length > 0 && (
              <>
                <tr>
                  <td colSpan={4} className="pt-4 pb-1 px-3">
                    <div
                      className="font-bold uppercase tracking-widest"
                      style={{ fontSize: 9, color: "#9ca3af" }}
                    >
                      Additional Charges
                    </div>
                  </td>
                </tr>
                {oneoffItems.map((item, idx) => (
                  <tr
                    key={`oneoff-${item.id || idx}`}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <td
                      className="py-2 px-3 text-center align-middle text-xs"
                      style={{ color: "#d1d5db" }}
                    >
                      -
                    </td>
                    <td className="py-2 px-3 align-middle">
                      <div className="font-medium" style={{ color: "#1f2937" }}>
                        {item.partName}
                      </div>
                    </td>
                    <td
                      className="py-2 px-3 text-right align-middle font-mono text-sm"
                      style={{ color: "#6b7280" }}
                    >
                      -
                    </td>
                    <td
                      className="py-2 px-3 text-right align-middle font-mono font-bold text-sm"
                      style={{ color: "#0D1117" }}
                    >
                      {cur}
                      {(item.sellPrice || 0).toFixed(2)}
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
                <div
                  className="font-bold uppercase tracking-widest mb-1"
                  style={{ fontSize: 9, color: "#9ca3af" }}
                >
                  Documentation Included
                </div>
                <div style={{ color: "#374151" }}>{certList}</div>
              </div>
            )}
            {quote.notes && (
              <div>
                <div
                  className="font-bold uppercase tracking-widest mb-1"
                  style={{ fontSize: 9, color: "#9ca3af" }}
                >
                  Notes
                </div>
                <div
                  className="whitespace-pre-line"
                  style={{ color: "#374151" }}
                >
                  {quote.notes}
                </div>
              </div>
            )}
            {settings.showBankDetails && settings.bankName && (
              <div
                className="p-4"
                style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }}
              >
                <div
                  className="font-bold uppercase tracking-widest mb-2"
                  style={{ fontSize: 9, color: "#9ca3af" }}
                >
                  Bank Details
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  <div>
                    <span style={{ color: "#9ca3af" }}>Bank:</span>{" "}
                    {settings.bankName}
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>Account Name:</span>{" "}
                    {settings.accountName}
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>Account No.:</span>{" "}
                    {settings.accountNumber}
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>Sort Code:</span>{" "}
                    {settings.sortCode}
                  </div>
                  {settings.iban && (
                    <div className="col-span-2">
                      <span style={{ color: "#9ca3af" }}>IBAN:</span>{" "}
                      {settings.iban}
                    </div>
                  )}
                  {settings.swiftBic && (
                    <div className="col-span-2">
                      <span style={{ color: "#9ca3af" }}>SWIFT/BIC:</span>{" "}
                      {settings.swiftBic}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-56 shrink-0">
            <div
              className="pt-4 space-y-2 text-sm"
              style={{ borderTop: "2px solid #111827" }}
            >
              <div className="flex justify-between">
                <span style={{ color: "#6b7280" }}>Subtotal</span>
                <span className="font-mono" style={{ color: "#1f2937" }}>
                  {cur}
                  {subtotal.toFixed(2)}
                </span>
              </div>
              {vatTotal > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: "#6b7280" }}>VAT</span>
                  <span className="font-mono" style={{ color: "#1f2937" }}>
                    {cur}
                    {vatTotal.toFixed(2)}
                  </span>
                </div>
              )}
              <div
                className="flex justify-between items-center px-3 py-3 mt-1"
                style={{ background: "#111827" }}
              >
                <span
                  className="font-bold text-base"
                  style={{ color: "#ffffff" }}
                >
                  Total
                </span>
                <span
                  className="font-bold text-xl font-mono"
                  style={{ color: "#ffffff" }}
                >
                  {cur}
                  {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── T&C ── */}
        {quote.termsAndConditions && (
          <div className="mt-8 pt-6" style={{ borderTop: "1px solid #e5e7eb" }}>
            <div
              className="font-bold uppercase tracking-widest mb-2"
              style={{ fontSize: 9, color: "#9ca3af" }}
            >
              Terms & Conditions
            </div>
            <div
              className="whitespace-pre-line leading-relaxed"
              style={{ fontSize: 11, color: "#6b7280" }}
            >
              {quote.termsAndConditions}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div
          className="mt-8 pt-4 flex justify-between items-center"
          style={{
            borderTop: "1px solid #e5e7eb",
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          <span>
            {settings.companyName}
            {settings.vatNumber ? ` · VAT ${settings.vatNumber}` : ""}
          </span>
          <span>
            Quote {quote.quoteNumber} Rev {quote.quoteRevision || "A"}
          </span>
          {settings.website && <span>{settings.website}</span>}
        </div>
      </div>
    </div>
  );
}
