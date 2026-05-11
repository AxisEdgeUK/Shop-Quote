import { format } from "date-fns";
import { Quote, Customer, Settings } from "@workspace/api-client-react";

interface PrintLayoutProps {
  quote: Quote;
  customer: Customer;
  settings: Settings;
}

export function PrintLayout({ quote, customer, settings }: PrintLayoutProps) {
  // Calculate totals
  const subtotal = quote.lineItems.reduce((sum, item) => sum + (item.sellPrice || 0), 0);
  const vatTotal = quote.lineItems.reduce((sum, item) => sum + (item.vatAmount || 0), 0);
  const grandTotal = subtotal + vatTotal;

  return (
    <div className="p-12 print:p-0 bg-white text-black font-sans min-h-[1056px] w-full max-w-[816px] mx-auto relative">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tighter mb-1">{settings.companyName || "COMPANY NAME"}</h1>
            <p className="text-gray-500 font-mono text-sm">PRECISION MACHINING & ENGINEERING</p>
          </div>
          <div className="text-right text-sm leading-relaxed">
            <div className="font-semibold text-lg mb-1">QUOTATION</div>
            <div><span className="text-gray-500 inline-block w-16">Date:</span> {format(new Date(quote.quoteDate), 'dd MMM yyyy')}</div>
            <div><span className="text-gray-500 inline-block w-16">Quote #:</span> <span className="font-mono">{quote.quoteNumber}</span></div>
            <div><span className="text-gray-500 inline-block w-16">Valid:</span> {format(new Date(quote.validUntil), 'dd MMM yyyy')}</div>
          </div>
        </div>

        {/* Addresses */}
        <div className="flex justify-between mb-12 text-sm">
          <div className="w-1/2 pr-4">
            <div className="font-bold text-gray-500 mb-2 uppercase tracking-wider text-xs">To</div>
            <div className="font-semibold text-base">{customer.companyName}</div>
            <div>Attn: {customer.contactName}</div>
            <div className="whitespace-pre-line text-gray-700 mt-1">{customer.address}</div>
          </div>
          <div className="w-1/2 pl-4 text-right">
            <div className="font-bold text-gray-500 mb-2 uppercase tracking-wider text-xs">From</div>
            <div className="font-semibold">{settings.companyName}</div>
            <div className="whitespace-pre-line text-gray-700 mt-1">{settings.address}</div>
            <div className="mt-2 text-gray-600">
              {settings.email && <div>{settings.email}</div>}
              {settings.phone && <div>{settings.phone}</div>}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="flex-1">
          <table className="w-full text-sm text-left mb-8 border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-3 px-2 font-bold w-12 text-center">Qty</th>
                <th className="py-3 px-2 font-bold">Part Details</th>
                <th className="py-3 px-2 font-bold text-right w-28">Unit Price</th>
                <th className="py-3 px-2 font-bold text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.lineItems.map((item, index) => (
                <tr key={item.id || index} className="border-b border-gray-200">
                  <td className="py-4 px-2 text-center align-top font-mono">{item.quantity}</td>
                  <td className="py-4 px-2 align-top">
                    <div className="font-bold text-base mb-1">{item.partName}</div>
                    <div className="text-gray-600 text-xs grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                      {item.drawingNumber && <div><span className="text-gray-400">Dwg:</span> {item.drawingNumber} {item.revision && `(Rev ${item.revision})`}</div>}
                      <div><span className="text-gray-400">Material:</span> {item.material}</div>
                      <div><span className="text-gray-400">Process:</span> {item.processType}</div>
                      <div><span className="text-gray-400">Finish:</span> {item.surfaceFinish}</div>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-right align-top">{settings.currency === 'GBP' ? '£' : '$'}{item.pricePerPart.toFixed(2)}</td>
                  <td className="py-4 px-2 text-right align-top font-semibold">{settings.currency === 'GBP' ? '£' : '$'}{item.sellPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Notes */}
        <div className="flex justify-between items-end mt-auto pt-8">
          <div className="w-2/3 pr-12">
            {quote.notes && (
              <div className="mb-6">
                <div className="font-bold text-xs uppercase tracking-wider mb-2">Notes</div>
                <div className="text-sm whitespace-pre-line text-gray-700">{quote.notes}</div>
              </div>
            )}
            {quote.paymentTerms && (
              <div className="mb-6">
                <div className="font-bold text-xs uppercase tracking-wider mb-2">Payment Terms</div>
                <div className="text-sm whitespace-pre-line text-gray-700">{quote.paymentTerms}</div>
              </div>
            )}
            {quote.termsAndConditions && (
              <div>
                <div className="font-bold text-xs uppercase tracking-wider mb-2">Terms & Conditions</div>
                <div className="text-xs whitespace-pre-line text-gray-500 leading-tight">{quote.termsAndConditions}</div>
              </div>
            )}
          </div>
          
          <div className="w-1/3 min-w-[250px]">
            <div className="border-t border-black pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{settings.currency === 'GBP' ? '£' : '$'}{subtotal.toFixed(2)}</span>
              </div>
              {vatTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">VAT</span>
                  <span>{settings.currency === 'GBP' ? '£' : '$'}{vatTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t-2 border-black pt-3 mt-3">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-xl">{settings.currency === 'GBP' ? '£' : '$'}{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          {settings.companyName} • {settings.website && `${settings.website} • `} VAT: {settings.vatNumber}
        </div>
      </div>
    </div>
  );
}
