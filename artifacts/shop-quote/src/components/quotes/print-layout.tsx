import { format } from "date-fns";
import { Quote, Customer, Settings } from "@workspace/api-client-react";

type PriceBreakRow = {
  qty: number;
  manual: boolean;
  priceEach?: number;
  total?: number;
  notes?: string;
};

const TOLERANCE_LABELS: Record<string, string> = {
  Loose: "Loose (general workshop)",
  Standard: "Standard (±0.10mm typical)",
  Tight: "Tight (±0.05mm or better)",
  Critical: "Critical (±0.01mm / fit-critical)",
};

function parsePriceBreakRows(raw: string | undefined): PriceBreakRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    if (typeof parsed[0] === "number") {
      return (parsed as number[]).map((qty) => ({ qty, manual: false }));
    }
    return parsed as PriceBreakRow[];
  } catch {
    return [];
  }
}

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
  const deliveryCostFloat = parseFloat(String(quote.deliveryCost || 0));
  const deliveryIncluded = quote.includeDeliveryInTotal && deliveryCostFloat > 0;
  const grandTotal = subtotal + (deliveryIncluded ? deliveryCostFloat : 0) + vatTotal;

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

  const priceBreakRows = parsePriceBreakRows(quote.priceBreakQtys);
  const defaultHourlyRate = settings.defaultHourlyRate || 65;
  const defaultSetupRate = settings.defaultSetupRate || 65;

  return (
    <div
      className="bg-white text-black font-sans w-full max-w-[816px] mx-auto print:max-w-none"
      style={{ fontFamily: "'Helvetica Neue', Arial, 'Liberation Sans', sans-serif" }}
    >
      <div style={{ padding: "44px 52px" }} className="print:p-0">

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingBottom: 20,
            marginBottom: 20,
            borderBottom: "2px solid #1e293b",
          }}
        >
          {/* Company block */}
          <div style={{ maxWidth: 300, flex: 1, paddingRight: 32 }}>
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.companyName}
                style={{ height: 56, width: "auto", objectFit: "contain", marginBottom: 8, display: "block" }}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#0f172a",
                  marginBottom: 6,
                  lineHeight: 1.1,
                }}
              >
                {settings.companyName || "YOUR COMPANY"}
              </div>
            )}
            {settings.logoUrl && settings.companyName && (
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
                {settings.companyName}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.7 }}>
              {settings.address && (
                <div style={{ whiteSpace: "pre-line" }}>{settings.address}</div>
              )}
              <div>
                {[settings.email, settings.phone, settings.website]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              {settings.vatNumber && (
                <div>VAT Reg: {settings.vatNumber}</div>
              )}
            </div>
          </div>

          {/* Document title + meta */}
          <div style={{ textAlign: "right", minWidth: 200 }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "0.1em",
                color: "#1e293b",
                marginBottom: 14,
                lineHeight: 1,
              }}
            >
              QUOTATION
            </div>
            <table style={{ marginLeft: "auto", fontSize: 12, borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ color: "#94a3b8", paddingRight: 12, paddingBottom: 4, textAlign: "right", whiteSpace: "nowrap", fontSize: 11 }}>
                    Quote No.
                  </td>
                  <td
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      paddingBottom: 4,
                      textAlign: "right",
                      color: "#0f172a",
                      fontSize: 13,
                    }}
                  >
                    {quote.quoteNumber}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "#94a3b8", paddingRight: 12, paddingBottom: 4, textAlign: "right", fontSize: 11 }}>
                    Revision
                  </td>
                  <td style={{ fontWeight: 600, paddingBottom: 4, textAlign: "right", color: "#334155" }}>
                    {quote.quoteRevision || "A"}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "#94a3b8", paddingRight: 12, paddingBottom: 4, textAlign: "right", fontSize: 11 }}>
                    Date
                  </td>
                  <td style={{ paddingBottom: 4, textAlign: "right", color: "#334155" }}>
                    {formatDate(quote.quoteDate)}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "#94a3b8", paddingRight: 12, paddingBottom: 4, textAlign: "right", fontSize: 11 }}>
                    Valid Until
                  </td>
                  <td style={{ fontWeight: 600, paddingBottom: 4, textAlign: "right", color: "#334155" }}>
                    {formatDate(quote.validUntil)}
                  </td>
                </tr>
                {quote.leadTime && (
                  <tr>
                    <td style={{ color: "#94a3b8", paddingRight: 12, textAlign: "right", fontSize: 11 }}>
                      Lead Time
                    </td>
                    <td style={{ fontWeight: 600, textAlign: "right", color: "#334155" }}>
                      {quote.leadTime}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── PREPARED FOR ───────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginBottom: 20,
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#94a3b8",
                marginBottom: 6,
              }}
            >
              Prepared For
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
              {customer.companyName}
            </div>
            {customer.contactName && (
              <div style={{ fontSize: 12, color: "#475569" }}>
                Attn: {customer.contactName}
              </div>
            )}
            {customer.address && (
              <div style={{ fontSize: 12, color: "#475569", whiteSpace: "pre-line", marginTop: 2 }}>
                {customer.address}
              </div>
            )}
            {customer.email && (
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                {customer.email}
              </div>
            )}
          </div>

          {/* Commercial terms inline */}
          {(quote.deliveryTerms || quote.paymentTerms) && (
            <div style={{ minWidth: 200, textAlign: "right" }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  marginBottom: 6,
                }}
              >
                Terms
              </div>
              {quote.deliveryTerms && (
                <div style={{ fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: "#94a3b8" }}>Delivery: </span>
                  <span style={{ fontWeight: 600, color: "#334155" }}>{quote.deliveryTerms}</span>
                </div>
              )}
              {quote.paymentTerms && (
                <div style={{ fontSize: 11 }}>
                  <span style={{ color: "#94a3b8" }}>Payment: </span>
                  <span style={{ fontWeight: 600, color: "#334155" }}>{quote.paymentTerms}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── LINE ITEMS TABLE ────────────────────────────────────── */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 24,
            fontSize: 12,
          }}
        >
          <thead>
            <tr style={{ background: "#1e293b" }}>
              <th
                style={{
                  padding: "9px 10px",
                  textAlign: "center",
                  color: "#cbd5e1",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  width: 48,
                }}
              >
                QTY
              </th>
              <th
                style={{
                  padding: "9px 10px",
                  textAlign: "left",
                  color: "#cbd5e1",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                }}
              >
                DESCRIPTION
              </th>
              <th
                style={{
                  padding: "9px 10px",
                  textAlign: "right",
                  color: "#cbd5e1",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  width: 100,
                }}
              >
                UNIT
              </th>
              <th
                style={{
                  padding: "9px 10px",
                  textAlign: "right",
                  color: "#cbd5e1",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  width: 110,
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
                style={{
                  borderBottom: "1px solid #f1f5f9",
                  background: idx % 2 === 1 ? "#fafafa" : "#ffffff",
                }}
              >
                <td
                  style={{
                    padding: "12px 10px",
                    textAlign: "center",
                    verticalAlign: "top",
                    fontFamily: "monospace",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  {item.quantity}
                </td>
                <td style={{ padding: "12px 10px", verticalAlign: "top" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 4 }}>
                    {item.partName}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "2px 24px",
                      fontSize: 10,
                      color: "#64748b",
                    }}
                  >
                    {item.drawingNumber && (
                      <span>
                        <span style={{ color: "#94a3b8" }}>Dwg: </span>
                        {item.drawingNumber}
                        {item.revision ? ` Rev ${item.revision}` : ""}
                      </span>
                    )}
                    {item.material && (
                      <span>
                        <span style={{ color: "#94a3b8" }}>Material: </span>
                        {item.material}
                      </span>
                    )}
                    {item.processType && (
                      <span>
                        <span style={{ color: "#94a3b8" }}>Process: </span>
                        {item.processType}
                      </span>
                    )}
                    {item.surfaceFinish && item.surfaceFinish !== "Standard" && (
                      <span>
                        <span style={{ color: "#94a3b8" }}>Finish: </span>
                        {item.surfaceFinish}
                      </span>
                    )}
                    {item.toleranceClass && item.toleranceClass !== "Standard" && (
                      <span>
                        <span style={{ color: "#94a3b8" }}>Tolerance: </span>
                        {TOLERANCE_LABELS[item.toleranceClass] ?? item.toleranceClass}
                      </span>
                    )}
                  </div>

                  {priceBreakRows.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "#94a3b8",
                          marginBottom: 4,
                        }}
                      >
                        Quantity Price Breaks
                      </div>
                      <table
                        style={{
                          fontSize: 11,
                          borderCollapse: "collapse",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            <th style={{ padding: "4px 10px", textAlign: "left", fontWeight: 600, color: "#64748b", fontSize: 10 }}>Qty</th>
                            <th style={{ padding: "4px 10px", textAlign: "right", fontWeight: 600, color: "#64748b", fontSize: 10 }}>Unit</th>
                            <th style={{ padding: "4px 10px", textAlign: "right", fontWeight: 600, color: "#64748b", fontSize: 10 }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            style={{
                              background: "#f1f5f9",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            <td style={{ padding: "4px 10px", fontFamily: "monospace", fontWeight: 600 }}>
                              {item.quantity}{" "}
                              <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 9 }}>(quoted)</span>
                            </td>
                            <td style={{ padding: "4px 10px", textAlign: "right", fontFamily: "monospace" }}>
                              {cur}{(item.pricePerPart || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: "4px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                              {cur}{(item.sellPrice || 0).toFixed(2)}
                            </td>
                          </tr>
                          {priceBreakRows
                            .filter((row) => row.qty !== item.quantity)
                            .map((row) => {
                              let perPart: number;
                              let total: number;
                              if (row.manual && row.priceEach != null) {
                                perPart = row.priceEach;
                                total = row.total ?? row.priceEach * row.qty;
                              } else {
                                const [calc] = calcPriceBreaks(
                                  item,
                                  [row.qty],
                                  defaultHourlyRate,
                                  defaultSetupRate,
                                  (item as any).machineHourlyRate || defaultHourlyRate,
                                );
                                perPart = calc.perPart;
                                total = calc.total;
                              }
                              return (
                                <tr
                                  key={row.qty}
                                  style={{ borderBottom: "1px solid #f1f5f9" }}
                                >
                                  <td style={{ padding: "4px 10px", fontFamily: "monospace" }}>
                                    {row.qty}
                                    {row.notes && (
                                      <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 9, marginLeft: 4 }}>
                                        · {row.notes}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: "4px 10px", textAlign: "right", fontFamily: "monospace" }}>
                                    {cur}{perPart.toFixed(2)}
                                  </td>
                                  <td style={{ padding: "4px 10px", textAlign: "right", fontFamily: "monospace" }}>
                                    {cur}{total.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: "12px 10px",
                    textAlign: "right",
                    verticalAlign: "top",
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#475569",
                  }}
                >
                  {priceBreakRows.length > 0
                    ? "—"
                    : `${cur}${(item.pricePerPart || 0).toFixed(2)}`}
                </td>
                <td
                  style={{
                    padding: "12px 10px",
                    textAlign: "right",
                    verticalAlign: "top",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    fontSize: 12,
                    color: "#0f172a",
                  }}
                >
                  {cur}{(item.sellPrice || 0).toFixed(2)}
                </td>
              </tr>
            ))}

            {oneoffItems.length > 0 && (
              <>
                <tr>
                  <td colSpan={4} style={{ padding: "12px 10px 4px" }}>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "#94a3b8",
                      }}
                    >
                      Additional Charges
                    </div>
                  </td>
                </tr>
                {oneoffItems.map((item, idx) => (
                  <tr
                    key={`oneoff-${item.id || idx}`}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td style={{ padding: "8px 10px", textAlign: "center", color: "#cbd5e1", fontSize: 11 }}>
                      —
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ fontWeight: 500, color: "#1e293b", fontSize: 12 }}>
                        {item.partName}
                      </div>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: "#64748b", fontSize: 12 }}>
                      —
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, fontSize: 12, color: "#0f172a" }}>
                      {cur}{(item.sellPrice || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>

        {/* ── TOTALS + NOTES ──────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 32, justifyContent: "space-between", alignItems: "flex-start" }}>

          {/* Left: notes, certs, bank */}
          <div style={{ flex: 1, fontSize: 12, lineHeight: 1.6 }}>
            {hasCerts && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>
                  Documentation Included
                </div>
                <div style={{ color: "#475569" }}>{certList}</div>
              </div>
            )}
            {quote.notes && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>
                  Notes
                </div>
                <div style={{ color: "#475569", whiteSpace: "pre-line" }}>{quote.notes}</div>
              </div>
            )}
            {settings.showBankDetails && settings.bankName && (
              <div
                style={{
                  padding: "12px 14px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  marginTop: 4,
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 6 }}>
                  Bank Details
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 16px", fontSize: 11, color: "#475569" }}>
                  <div><span style={{ color: "#94a3b8" }}>Bank: </span>{settings.bankName}</div>
                  <div><span style={{ color: "#94a3b8" }}>Account Name: </span>{settings.accountName}</div>
                  <div><span style={{ color: "#94a3b8" }}>Account No.: </span>{settings.accountNumber}</div>
                  <div><span style={{ color: "#94a3b8" }}>Sort Code: </span>{settings.sortCode}</div>
                  {settings.iban && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ color: "#94a3b8" }}>IBAN: </span>{settings.iban}
                    </div>
                  )}
                  {settings.swiftBic && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ color: "#94a3b8" }}>SWIFT/BIC: </span>{settings.swiftBic}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: totals */}
          <div style={{ minWidth: 220, flexShrink: 0 }}>
            <div style={{ borderTop: "2px solid #1e293b", paddingTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>Subtotal</span>
                <span style={{ fontFamily: "monospace", color: "#334155" }}>
                  {cur}{subtotal.toFixed(2)}
                </span>
              </div>
              {deliveryIncluded && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "#64748b" }}>
                    Delivery{quote.deliveryMethod ? ` (${quote.deliveryMethod})` : ""}
                  </span>
                  <span style={{ fontFamily: "monospace", color: "#334155" }}>
                    {cur}{deliveryCostFloat.toFixed(2)}
                  </span>
                </div>
              )}
              {!deliveryIncluded && quote.deliveryMethod && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "#64748b" }}>Delivery</span>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{quote.deliveryMethod}</span>
                </div>
              )}
              {vatTotal > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "#64748b" }}>VAT</span>
                  <span style={{ fontFamily: "monospace", color: "#334155" }}>
                    {cur}{vatTotal.toFixed(2)}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  marginTop: 4,
                  background: "#1e293b",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14, color: "#f8fafc" }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 18, fontFamily: "monospace", color: "#f8fafc" }}>
                  {cur}{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── T&C ─────────────────────────────────────────────────── */}
        {quote.termsAndConditions && (
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 6 }}>
              Terms &amp; Conditions
            </div>
            <div style={{ fontSize: 10, color: "#64748b", whiteSpace: "pre-line", lineHeight: 1.7 }}>
              {quote.termsAndConditions}
            </div>
          </div>
        )}

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 10,
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 10,
            color: "#94a3b8",
          }}
        >
          <span>
            {settings.companyName}
            {settings.vatNumber ? ` · VAT Reg ${settings.vatNumber}` : ""}
          </span>
          <span>
            Quote {quote.quoteNumber} Rev {quote.quoteRevision || "A"}
            {settings.website ? ` · ${settings.website}` : ""}
          </span>
        </div>

      </div>
    </div>
  );
}
