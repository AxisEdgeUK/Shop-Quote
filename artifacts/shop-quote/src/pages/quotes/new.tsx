import { useState, useMemo } from "react";
import {
  useCreateQuote,
  useGetQuote,
  getListQuotesQueryKey,
  getGetQuoteQueryKey,
} from "@workspace/api-client-react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  QuoteWizard,
  QuoteFormValues,
} from "@/components/quotes/quote-wizard";
import { QuoteWorkspace } from "@/components/quotes/quote-workspace";
import { useWorkflowDefaults } from "@/hooks/use-workflow-defaults";
import { Skeleton } from "@/components/ui/skeleton";

export function NewQuote() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const fromId = params.get("from") ? Number(params.get("from")) : null;
  const template = params.get("template") ?? undefined;

  const createQuote = useCreateQuote();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { save: saveDefaults } = useWorkflowDefaults();
  const [savedQuoteId, setSavedQuoteId] = useState<number | undefined>();

  const { data: sourceQuote, isLoading: isLoadingSource } = useGetQuote(
    fromId ?? 0,
    {
      query: {
        enabled: !!fromId,
        queryKey: getGetQuoteQueryKey(fromId ?? 0),
      },
    },
  );

  const initialValues = useMemo<QuoteFormValues | undefined>(() => {
    if (!fromId || !sourceQuote) return undefined;
    const today = new Date().toISOString().split("T")[0];
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 30);
    return {
      customerId: sourceQuote.customerId,
      status: "Draft",
      quoteDate: today,
      validUntil: validUntilDate.toISOString().split("T")[0],
      quoteRevision: "A",
      revisionNotes: "",
      leadTime: sourceQuote.leadTime || "",
      deliveryTerms: sourceQuote.deliveryTerms || "",
      notes: sourceQuote.notes || "",
      internalNotes: "",
      paymentTerms: sourceQuote.paymentTerms || "",
      termsAndConditions: sourceQuote.termsAndConditions || "",
      materialCertIncluded: sourceQuote.materialCertIncluded ?? false,
      inspectionReportIncluded: sourceQuote.inspectionReportIncluded ?? false,
      fairIncluded: sourceQuote.fairIncluded ?? false,
      cmmReportIncluded: sourceQuote.cmmReportIncluded ?? false,
      priceBreakQtys: sourceQuote.priceBreakQtys || "",
      lineItems: (sourceQuote.lineItems || []).map((item) => ({
        partName: item.partName,
        drawingNumber: item.drawingNumber || "",
        revision: item.revision || "",
        quantity: item.quantity,
        material: item.material || "",
        processType: item.processType || "Milling",
        machineId: item.machineId ?? null,
        toleranceClass: item.toleranceClass || "",
        surfaceFinish: item.surfaceFinish || "",
        complexity: (item.complexity as any) || "Medium",
        hiddenFromPdf: item.hiddenFromPdf ?? false,
        setupHours: parseFloat(String(item.setupHours || 0)),
        programmingHours: parseFloat(String(item.programmingHours || 0)),
        machiningMinutesPerPart: parseFloat(
          String(item.machiningMinutesPerPart || 0),
        ),
        inspectionHours: parseFloat(String(item.inspectionHours || 0)),
        deburringMinutesPerPart: parseFloat(
          String(item.deburringMinutesPerPart || 0),
        ),
        materialCostPerUnit: parseFloat(String(item.materialCostPerUnit || 0)),
        materialWastagePercentage: parseFloat(
          String(item.materialWastagePercentage || 10),
        ),
        toolingAllowance: parseFloat(String(item.toolingAllowance || 0)),
        outsideProcessing: parseFloat(String(item.outsideProcessing || 0)),
        packaging: parseFloat(String(item.packaging || 0)),
        delivery: parseFloat(String(item.delivery || 0)),
        riskPercentage: parseFloat(String(item.riskPercentage || 10)),
        profitMarginPercentage: parseFloat(
          String(item.profitMarginPercentage || 30),
        ),
        discountPercentage: parseFloat(String(item.discountPercentage || 0)),
        vatEnabled: item.vatEnabled ?? false,
        vatRate: parseFloat(String(item.vatRate || 20)),
      })),
    } as QuoteFormValues;
  }, [fromId, sourceQuote]);

  const handleSubmit = (data: QuoteFormValues) => {
    const firstItem = data.lineItems?.[0];
    if (firstItem) {
      saveDefaults({
        machineId: firstItem.machineId ?? undefined,
        material: firstItem.material,
        margin: firstItem.profitMarginPercentage,
        leadTime: data.leadTime,
        paymentTerms: data.paymentTerms,
      });
    }
    createQuote.mutate(
      { data: data as any },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          toast({ title: "Quote saved successfully" });
          setSavedQuoteId(result.id);
          setTimeout(() => setLocation(`/quotes/${result.id}`), 1500);
        },
        onError: () => {
          toast({ title: "Failed to save quote", variant: "destructive" });
        },
      },
    );
  };

  if (fromId && isLoadingSource) {
    return (
      <div className="max-w-2xl mx-auto mt-8 space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  const title = fromId ? `Quote Similar Job` : "New Quote";

  return (
    <QuoteWorkspace title={title} backHref="/quotes">
      <QuoteWizard
        onSubmit={handleSubmit}
        isSubmitting={createQuote.isPending}
        savedQuoteId={savedQuoteId}
        initialValues={initialValues}
      />
    </QuoteWorkspace>
  );
}
