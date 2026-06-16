import { Router, type IRouter } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import {
  db,
  quotesTable,
  quoteLineItemsTable,
  customersTable,
  machinesTable,
  settingsTable,
  quoteDrawingsTable,
} from "@workspace/db";
import {
  CreateQuoteBody,
  GetQuoteParams,
  GetQuoteResponse,
  UpdateQuoteParams,
  UpdateQuoteBody,
  UpdateQuoteResponse,
  DeleteQuoteParams,
  DuplicateQuoteParams,
  ListQuotesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function calcLineItem(item: {
  setupHours: number;
  programmingHours: number;
  machiningMinutesPerPart: number;
  inspectionHours: number;
  deburringMinutesPerPart: number;
  materialCostPerUnit: number;
  materialWastagePercentage: number;
  toolingAllowance: number;
  outsideProcessing: number;
  packaging: number;
  delivery: number;
  riskPercentage: number;
  profitMarginPercentage: number;
  discountPercentage: number;
  vatEnabled: boolean;
  vatRate: number;
  quantity: number;
  setupRate: number;
  hourlyRate: number;
  machineHourlyRate: number;
}) {
  const setupCost = item.setupHours * item.setupRate;
  const programmingCost = item.programmingHours * item.hourlyRate;
  const machiningCost =
    (item.machiningMinutesPerPart / 60) *
    item.quantity *
    item.machineHourlyRate;
  const inspectionCost = item.inspectionHours * item.hourlyRate;
  const deburringCost =
    (item.deburringMinutesPerPart / 60) * item.quantity * item.hourlyRate;
  const materialCostTotal =
    item.materialCostPerUnit *
    item.quantity *
    (1 + item.materialWastagePercentage / 100);

  const directCost =
    setupCost +
    programmingCost +
    machiningCost +
    inspectionCost +
    deburringCost +
    materialCostTotal +
    item.toolingAllowance +
    item.outsideProcessing +
    item.packaging +
    item.delivery;

  const riskValue = directCost * (item.riskPercentage / 100);
  const costBeforeMargin = directCost + riskValue;
  const margin = item.profitMarginPercentage / 100;
  const preSellPrice =
    margin >= 1 ? costBeforeMargin : costBeforeMargin / (1 - margin);
  const sellPrice =
    item.discountPercentage > 0
      ? preSellPrice * (1 - item.discountPercentage / 100)
      : preSellPrice;
  const pricePerPart = item.quantity > 0 ? sellPrice / item.quantity : 0;
  const vatAmount = item.vatEnabled ? sellPrice * (item.vatRate / 100) : 0;
  const totalIncVat = item.vatEnabled ? sellPrice + vatAmount : sellPrice;

  return {
    setupCost,
    programmingCost,
    machiningCost,
    inspectionCost,
    deburringCost,
    materialCostTotal,
    directCost,
    riskValue,
    costBeforeMargin,
    sellPrice,
    pricePerPart,
    vatAmount,
    totalIncVat,
  };
}

function parseLineItem(item: typeof quoteLineItemsTable.$inferSelect) {
  return {
    ...item,
    setupHours: parseFloat(item.setupHours),
    programmingHours: parseFloat(item.programmingHours),
    machiningMinutesPerPart: parseFloat(item.machiningMinutesPerPart),
    inspectionHours: parseFloat(item.inspectionHours),
    deburringMinutesPerPart: parseFloat(item.deburringMinutesPerPart),
    materialCostPerUnit: parseFloat(item.materialCostPerUnit),
    materialWastagePercentage: parseFloat(item.materialWastagePercentage),
    toolingAllowance: parseFloat(item.toolingAllowance),
    outsideProcessing: parseFloat(item.outsideProcessing),
    packaging: parseFloat(item.packaging),
    delivery: parseFloat(item.delivery),
    riskPercentage: parseFloat(item.riskPercentage),
    profitMarginPercentage: parseFloat(item.profitMarginPercentage),
    discountPercentage: parseFloat(item.discountPercentage),
    vatRate: parseFloat(item.vatRate),
    machineHourlyRate: parseFloat(item.machineHourlyRate),
    machineSetupRate: parseFloat(item.machineSetupRate),
    setupCost: parseFloat(item.setupCost),
    programmingCost: parseFloat(item.programmingCost),
    machiningCost: parseFloat(item.machiningCost),
    inspectionCost: parseFloat(item.inspectionCost),
    deburringCost: parseFloat(item.deburringCost),
    materialCostTotal: parseFloat(item.materialCostTotal),
    directCost: parseFloat(item.directCost),
    riskValue: parseFloat(item.riskValue),
    costBeforeMargin: parseFloat(item.costBeforeMargin),
    sellPrice: parseFloat(item.sellPrice),
    pricePerPart: parseFloat(item.pricePerPart),
    vatAmount: parseFloat(item.vatAmount),
    totalIncVat: parseFloat(item.totalIncVat),
  };
}

function parseQuote(
  quote: typeof quotesTable.$inferSelect,
  lineItems: (typeof quoteLineItemsTable.$inferSelect)[],
) {
  return {
    ...quote,
    deliveryCost: parseFloat(String(quote.deliveryCost ?? 0)),
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
    lineItems: lineItems.map(parseLineItem),
  };
}

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const quotes = await db
    .select({ quoteNumber: quotesTable.quoteNumber })
    .from(quotesTable);
  const prefix = `QT-${year}-`;
  const existingNumbers = quotes
    .map((q) => q.quoteNumber)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.replace(prefix, ""), 10))
    .filter((n) => !isNaN(n));
  const next =
    existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

async function getDefaultRates() {
  const rows = await db.select().from(settingsTable).limit(1);
  if (rows.length > 0) {
    return {
      defaultHourlyRate: parseFloat(rows[0].defaultHourlyRate),
      defaultSetupRate: parseFloat(rows[0].defaultSetupRate),
    };
  }
  return { defaultHourlyRate: 65, defaultSetupRate: 65 };
}

async function insertLineItems(
  quoteId: number,
  lineItemsData: NonNullable<typeof CreateQuoteBody._type.lineItems>,
) {
  const defaults = await getDefaultRates();

  for (const item of lineItemsData) {
    let machineHourlyRate = defaults.defaultHourlyRate;
    let setupRate = defaults.defaultSetupRate;
    let hourlyRate = defaults.defaultHourlyRate;

    if (item.machineId) {
      const [machine] = await db
        .select()
        .from(machinesTable)
        .where(eq(machinesTable.id, item.machineId));
      if (machine) {
        machineHourlyRate = parseFloat(machine.hourlyRate);
        setupRate = parseFloat(machine.setupRate);
        hourlyRate = parseFloat(machine.hourlyRate);
      }
    }

    const calcs = calcLineItem({
      setupHours: item.setupHours,
      programmingHours: item.programmingHours,
      machiningMinutesPerPart: item.machiningMinutesPerPart,
      inspectionHours: item.inspectionHours,
      deburringMinutesPerPart: item.deburringMinutesPerPart,
      materialCostPerUnit: item.materialCostPerUnit,
      materialWastagePercentage: item.materialWastagePercentage,
      toolingAllowance: item.toolingAllowance,
      outsideProcessing: item.outsideProcessing,
      packaging: item.packaging,
      delivery: item.delivery,
      riskPercentage: item.riskPercentage,
      profitMarginPercentage: item.profitMarginPercentage,
      discountPercentage: item.discountPercentage ?? 0,
      vatEnabled: item.vatEnabled ?? false,
      vatRate: item.vatRate ?? 20,
      quantity: item.quantity,
      setupRate,
      hourlyRate,
      machineHourlyRate,
    });

    await db.insert(quoteLineItemsTable).values({
      quoteId,
      partName: item.partName,
      drawingNumber: item.drawingNumber ?? "",
      revision: item.revision ?? "",
      quantity: item.quantity,
      material: item.material,
      processType: item.processType,
      machineId: item.machineId ?? null,
      toleranceClass: item.toleranceClass ?? "Standard",
      surfaceFinish: item.surfaceFinish ?? "Standard",
      complexity: item.complexity ?? "Medium",
      lineItemType: item.lineItemType ?? "standard",
      hiddenFromPdf: item.hiddenFromPdf ?? false,
      setupHours: String(item.setupHours),
      programmingHours: String(item.programmingHours),
      machiningMinutesPerPart: String(item.machiningMinutesPerPart),
      inspectionHours: String(item.inspectionHours),
      deburringMinutesPerPart: String(item.deburringMinutesPerPart),
      materialCostPerUnit: String(item.materialCostPerUnit),
      materialWastagePercentage: String(item.materialWastagePercentage),
      toolingAllowance: String(item.toolingAllowance),
      outsideProcessing: String(item.outsideProcessing),
      packaging: String(item.packaging),
      delivery: String(item.delivery),
      riskPercentage: String(item.riskPercentage),
      profitMarginPercentage: String(item.profitMarginPercentage),
      discountPercentage: String(item.discountPercentage ?? 0),
      vatEnabled: item.vatEnabled ?? false,
      vatRate: String(item.vatRate ?? 20),
      machineHourlyRate: String(machineHourlyRate),
      machineSetupRate: String(setupRate),
      setupCost: String(calcs.setupCost),
      programmingCost: String(calcs.programmingCost),
      machiningCost: String(calcs.machiningCost),
      inspectionCost: String(calcs.inspectionCost),
      deburringCost: String(calcs.deburringCost),
      materialCostTotal: String(calcs.materialCostTotal),
      directCost: String(calcs.directCost),
      riskValue: String(calcs.riskValue),
      costBeforeMargin: String(calcs.costBeforeMargin),
      sellPrice: String(calcs.sellPrice),
      pricePerPart: String(calcs.pricePerPart),
      vatAmount: String(calcs.vatAmount),
      totalIncVat: String(calcs.totalIncVat),
      toolingRecommendation: item.toolingRecommendation ?? "",
      materialRecommendation: item.materialRecommendation ?? "",
      coolantRecommendation: item.coolantRecommendation ?? "",
    });
  }
}

router.get("/quotes", async (req, res): Promise<void> => {
  const quotes = await db
    .select({
      id: quotesTable.id,
      quoteNumber: quotesTable.quoteNumber,
      customerId: quotesTable.customerId,
      status: quotesTable.status,
      quoteDate: quotesTable.quoteDate,
      validUntil: quotesTable.validUntil,
      createdAt: quotesTable.createdAt,
      customerName: customersTable.companyName,
      lostReason: quotesTable.lostReason,
      followUpDate: quotesTable.followUpDate,
    })
    .from(quotesTable)
    .leftJoin(customersTable, eq(quotesTable.customerId, customersTable.id))
    .orderBy(desc(quotesTable.createdAt));

  const lineItems = await db
    .select({
      id: quoteLineItemsTable.id,
      quoteId: quoteLineItemsTable.quoteId,
      sellPrice: quoteLineItemsTable.sellPrice,
      partName: quoteLineItemsTable.partName,
      material: quoteLineItemsTable.material,
      processType: quoteLineItemsTable.processType,
      drawingNumber: quoteLineItemsTable.drawingNumber,
    })
    .from(quoteLineItemsTable);

  type FirstItem = { minId: number; partName: string; material: string; processType: string; drawingNumber: string };
  const quoteTotals = new Map<number, number>();
  const quoteFirstItem = new Map<number, FirstItem>();
  for (const item of lineItems) {
    const current = quoteTotals.get(item.quoteId) ?? 0;
    quoteTotals.set(item.quoteId, current + parseFloat(item.sellPrice));
    const existing = quoteFirstItem.get(item.quoteId);
    if (!existing || item.id < existing.minId) {
      quoteFirstItem.set(item.quoteId, {
        minId: item.id,
        partName: item.partName,
        material: item.material,
        processType: item.processType,
        drawingNumber: item.drawingNumber,
      });
    }
  }

  const result = quotes.map((q) => {
    const first = quoteFirstItem.get(q.id);
    return {
      id: q.id,
      quoteNumber: q.quoteNumber,
      customerId: q.customerId,
      customerName: q.customerName ?? "Unknown",
      status: q.status,
      quoteDate: q.quoteDate,
      validUntil: q.validUntil,
      totalValue: quoteTotals.get(q.id) ?? 0,
      createdAt: q.createdAt.toISOString(),
      lostReason: q.lostReason ?? undefined,
      followUpDate: q.followUpDate ?? null,
      partName: first?.partName ?? "",
      material: first?.material ?? "",
      processType: first?.processType ?? "",
      drawingNumber: first?.drawingNumber ?? "",
    };
  });

  res.json(ListQuotesResponse.parse(result));
});

router.post("/quotes", async (req, res): Promise<void> => {
  const parsed = CreateQuoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const settingsRows = await db.select().from(settingsTable).limit(1);
  const s = settingsRows[0];
  const validDays = s ? s.quoteValidityDays : 30;
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + validDays);
  const validUntil = validUntilDate.toISOString().split("T")[0];

  const quoteNumber = await generateQuoteNumber();
  const [quote] = await db
    .insert(quotesTable)
    .values({
      quoteNumber,
      customerId: parsed.data.customerId,
      status: parsed.data.status ?? "Draft",
      lostReason: parsed.data.lostReason ?? "",
      quoteDate: parsed.data.quoteDate ?? today,
      validUntil: parsed.data.validUntil ?? validUntil,
      quoteRevision: parsed.data.quoteRevision ?? "A",
      revisionNotes: parsed.data.revisionNotes ?? "",
      leadTime: parsed.data.leadTime ?? s?.defaultLeadTime ?? "",
      deliveryTerms: parsed.data.deliveryTerms ?? s?.defaultDeliveryTerms ?? "",
      notes: parsed.data.notes ?? "",
      internalNotes: parsed.data.internalNotes ?? "",
      paymentTerms:
        parsed.data.paymentTerms ??
        s?.paymentTerms ??
        "30 days from invoice date",
      termsAndConditions:
        parsed.data.termsAndConditions ?? s?.termsAndConditions ?? "",
      materialCertIncluded: parsed.data.materialCertIncluded ?? false,
      inspectionReportIncluded: parsed.data.inspectionReportIncluded ?? false,
      fairIncluded: parsed.data.fairIncluded ?? false,
      cmmReportIncluded: parsed.data.cmmReportIncluded ?? false,
      priceBreakQtys: parsed.data.priceBreakQtys ?? "",
      deliveryMethod: parsed.data.deliveryMethod ?? "",
      deliveryCost: String(parsed.data.deliveryCost ?? 0),
      includeDeliveryInTotal: parsed.data.includeDeliveryInTotal ?? true,
      rfqReceivedDate: parsed.data.rfqReceivedDate ?? null,
      quoteSentDate: parsed.data.quoteSentDate ?? null,
      followUpDate: parsed.data.followUpDate ?? null,
      followUpNotes: parsed.data.followUpNotes ?? "",
      lastContactedDate: parsed.data.lastContactedDate ?? null,
      nextAction: parsed.data.nextAction ?? "",
      customerFeedback: parsed.data.customerFeedback ?? "",
    })
    .returning();

  if (parsed.data.lineItems && parsed.data.lineItems.length > 0) {
    await insertLineItems(quote.id, parsed.data.lineItems);
  }

  const items = await db
    .select()
    .from(quoteLineItemsTable)
    .where(eq(quoteLineItemsTable.quoteId, quote.id));
  res.status(201).json(GetQuoteResponse.parse(parseQuote(quote, items)));
});

const VALID_STATUSES = ["Draft", "Sent", "Won", "Lost", "Expired"] as const;

function parseBulkIds(body: unknown): number[] | null {
  if (!body || typeof body !== "object") return null;
  const { ids } = body as Record<string, unknown>;
  if (!Array.isArray(ids) || ids.length === 0) return null;
  if (!ids.every((x) => typeof x === "number" && Number.isInteger(x) && x > 0))
    return null;
  return ids as number[];
}

router.delete("/quotes/bulk", async (req, res): Promise<void> => {
  const ids = parseBulkIds(req.body);
  if (!ids) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }
  await db
    .delete(quoteLineItemsTable)
    .where(inArray(quoteLineItemsTable.quoteId, ids));
  await db.delete(quotesTable).where(inArray(quotesTable.id, ids));
  res.json({ deleted: ids.length });
});

router.patch("/quotes/bulk/status", async (req, res): Promise<void> => {
  const ids = parseBulkIds(req.body);
  const { status } = (req.body ?? {}) as { status?: string };
  if (!ids || !status || !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    res.status(400).json({ error: "Invalid ids or status" });
    return;
  }
  await db
    .update(quotesTable)
    .set({ status: status as typeof VALID_STATUSES[number] })
    .where(inArray(quotesTable.id, ids));
  res.json({ updated: ids.length });
});

router.get("/quotes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetQuoteParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [quote] = await db
    .select()
    .from(quotesTable)
    .where(eq(quotesTable.id, params.data.id));
  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }
  const items = await db
    .select()
    .from(quoteLineItemsTable)
    .where(eq(quoteLineItemsTable.quoteId, quote.id));
  res.json(GetQuoteResponse.parse(parseQuote(quote, items)));
});

router.patch("/quotes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateQuoteParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateQuoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (d.customerId !== undefined) updateData.customerId = d.customerId;
  if (d.status !== undefined) updateData.status = d.status;
  if (d.lostReason !== undefined) updateData.lostReason = d.lostReason;
  if (d.quoteDate !== undefined) updateData.quoteDate = d.quoteDate;
  if (d.validUntil !== undefined) updateData.validUntil = d.validUntil;
  if (d.quoteRevision !== undefined) updateData.quoteRevision = d.quoteRevision;
  if (d.revisionNotes !== undefined) updateData.revisionNotes = d.revisionNotes;
  if (d.leadTime !== undefined) updateData.leadTime = d.leadTime;
  if (d.deliveryTerms !== undefined) updateData.deliveryTerms = d.deliveryTerms;
  if (d.notes !== undefined) updateData.notes = d.notes;
  if (d.internalNotes !== undefined) updateData.internalNotes = d.internalNotes;
  if (d.paymentTerms !== undefined) updateData.paymentTerms = d.paymentTerms;
  if (d.termsAndConditions !== undefined)
    updateData.termsAndConditions = d.termsAndConditions;
  if (d.materialCertIncluded !== undefined)
    updateData.materialCertIncluded = d.materialCertIncluded;
  if (d.inspectionReportIncluded !== undefined)
    updateData.inspectionReportIncluded = d.inspectionReportIncluded;
  if (d.fairIncluded !== undefined) updateData.fairIncluded = d.fairIncluded;
  if (d.cmmReportIncluded !== undefined)
    updateData.cmmReportIncluded = d.cmmReportIncluded;
  if (d.priceBreakQtys !== undefined)
    updateData.priceBreakQtys = d.priceBreakQtys;
  if (d.deliveryMethod !== undefined) updateData.deliveryMethod = d.deliveryMethod;
  if (d.deliveryCost !== undefined) updateData.deliveryCost = String(d.deliveryCost);
  if (d.includeDeliveryInTotal !== undefined)
    updateData.includeDeliveryInTotal = d.includeDeliveryInTotal;
  if (d.wonDate !== undefined) updateData.wonDate = d.wonDate;
  if (d.wonNotes !== undefined) updateData.wonNotes = d.wonNotes;
  if (d.poNumber !== undefined) updateData.poNumber = d.poNumber;
  if (d.expectedDelivery !== undefined)
    updateData.expectedDelivery = d.expectedDelivery;
  if (d.lostDate !== undefined) updateData.lostDate = d.lostDate;
  if (d.lostNotes !== undefined) updateData.lostNotes = d.lostNotes;
  if (d.rfqReceivedDate !== undefined) updateData.rfqReceivedDate = d.rfqReceivedDate;
  if (d.quoteSentDate !== undefined) updateData.quoteSentDate = d.quoteSentDate;
  if (d.followUpDate !== undefined) updateData.followUpDate = d.followUpDate;
  if (d.followUpNotes !== undefined) updateData.followUpNotes = d.followUpNotes;
  if (d.lastContactedDate !== undefined) updateData.lastContactedDate = d.lastContactedDate;
  if (d.nextAction !== undefined) updateData.nextAction = d.nextAction;
  if (d.customerFeedback !== undefined) updateData.customerFeedback = d.customerFeedback;

  if (d.status === "Sent" && updateData.status === "Sent") {
    const today = new Date().toISOString().split("T")[0];
    if (!updateData.quoteSentDate) updateData.quoteSentDate = today;
  }

  const [quote] = await db
    .update(quotesTable)
    .set(updateData)
    .where(eq(quotesTable.id, params.data.id))
    .returning();
  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }

  if (d.lineItems !== undefined) {
    await db
      .delete(quoteLineItemsTable)
      .where(eq(quoteLineItemsTable.quoteId, quote.id));
    if (d.lineItems.length > 0) {
      await insertLineItems(quote.id, d.lineItems);
    }
  }

  const items = await db
    .select()
    .from(quoteLineItemsTable)
    .where(eq(quoteLineItemsTable.quoteId, quote.id));
  res.json(UpdateQuoteResponse.parse(parseQuote(quote, items)));
});

router.delete("/quotes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteQuoteParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [quote] = await db
    .delete(quotesTable)
    .where(eq(quotesTable.id, params.data.id))
    .returning();
  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/quotes/:id/duplicate", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DuplicateQuoteParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [original] = await db
    .select()
    .from(quotesTable)
    .where(eq(quotesTable.id, params.data.id));
  if (!original) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }
  const originalItems = await db
    .select()
    .from(quoteLineItemsTable)
    .where(eq(quoteLineItemsTable.quoteId, original.id));

  const quoteNumber = await generateQuoteNumber();
  const today = new Date().toISOString().split("T")[0];
  const [newQuote] = await db
    .insert(quotesTable)
    .values({
      quoteNumber,
      customerId: original.customerId,
      status: "Draft",
      lostReason: "",
      quoteDate: today,
      validUntil: original.validUntil,
      quoteRevision: "A",
      revisionNotes: "",
      leadTime: original.leadTime,
      deliveryTerms: original.deliveryTerms,
      notes: original.notes,
      internalNotes: original.internalNotes,
      paymentTerms: original.paymentTerms,
      termsAndConditions: original.termsAndConditions,
      materialCertIncluded: original.materialCertIncluded,
      inspectionReportIncluded: original.inspectionReportIncluded,
      fairIncluded: original.fairIncluded,
      cmmReportIncluded: original.cmmReportIncluded,
      priceBreakQtys: original.priceBreakQtys,
      deliveryMethod: original.deliveryMethod,
      deliveryCost: original.deliveryCost,
      includeDeliveryInTotal: original.includeDeliveryInTotal,
    })
    .returning();

  for (const item of originalItems) {
    const { id, quoteId, createdAt, ...rest } = item;
    await db
      .insert(quoteLineItemsTable)
      .values({ ...rest, quoteId: newQuote.id });
  }

  const items = await db
    .select()
    .from(quoteLineItemsTable)
    .where(eq(quoteLineItemsTable.quoteId, newQuote.id));
  res.status(201).json(GetQuoteResponse.parse(parseQuote(newQuote, items)));
});

// Clone: same as duplicate but appends " (Copy)" to the first part name.
// Drawing files are not copied — clone starts with no drawings attached.
router.post("/quotes/:id/clone", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DuplicateQuoteParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [original] = await db
    .select()
    .from(quotesTable)
    .where(eq(quotesTable.id, params.data.id));
  if (!original) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }
  const originalItems = await db
    .select()
    .from(quoteLineItemsTable)
    .where(eq(quoteLineItemsTable.quoteId, original.id));

  const quoteNumber = await generateQuoteNumber();
  const today = new Date().toISOString().split("T")[0];
  const [newQuote] = await db
    .insert(quotesTable)
    .values({
      quoteNumber,
      customerId: original.customerId,
      status: "Draft",
      lostReason: "",
      quoteDate: today,
      validUntil: original.validUntil,
      quoteRevision: "A",
      revisionNotes: "",
      leadTime: original.leadTime,
      deliveryTerms: original.deliveryTerms,
      notes: original.notes,
      internalNotes: original.internalNotes,
      paymentTerms: original.paymentTerms,
      termsAndConditions: original.termsAndConditions,
      materialCertIncluded: original.materialCertIncluded,
      inspectionReportIncluded: original.inspectionReportIncluded,
      fairIncluded: original.fairIncluded,
      cmmReportIncluded: original.cmmReportIncluded,
      priceBreakQtys: original.priceBreakQtys,
      deliveryMethod: original.deliveryMethod,
      deliveryCost: original.deliveryCost,
      includeDeliveryInTotal: original.includeDeliveryInTotal,
    })
    .returning();

  for (let i = 0; i < originalItems.length; i++) {
    const { id, quoteId, createdAt, ...rest } = originalItems[i];
    await db.insert(quoteLineItemsTable).values({
      ...rest,
      quoteId: newQuote.id,
      partName:
        i === 0 && rest.partName ? `${rest.partName} (Copy)` : rest.partName,
    });
  }

  const clonedItems = await db
    .select()
    .from(quoteLineItemsTable)
    .where(eq(quoteLineItemsTable.quoteId, newQuote.id));
  res
    .status(201)
    .json(GetQuoteResponse.parse(parseQuote(newQuote, clonedItems)));
});

router.get("/quotes/:id/drawings", async (req, res): Promise<void> => {
  const id = parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10,
  );
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const drawings = await db
    .select()
    .from(quoteDrawingsTable)
    .where(eq(quoteDrawingsTable.quoteId, id));
  res.json(
    drawings.map((d) => ({ ...d, uploadedAt: d.uploadedAt.toISOString() })),
  );
});

router.post("/quotes/:id/drawings", async (req, res): Promise<void> => {
  const id = parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10,
  );
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const {
    objectPath,
    filename,
    contentType,
    drawingNumber = "",
    revision = "",
  } = req.body as {
    objectPath?: string;
    filename?: string;
    contentType?: string;
    drawingNumber?: string;
    revision?: string;
  };
  if (!objectPath || !filename || !contentType) {
    res
      .status(400)
      .json({ error: "objectPath, filename, and contentType are required" });
    return;
  }
  const [drawing] = await db
    .insert(quoteDrawingsTable)
    .values({
      quoteId: id,
      filename,
      contentType,
      objectPath,
      drawingNumber,
      revision,
    })
    .returning();
  res
    .status(201)
    .json({ ...drawing, uploadedAt: drawing.uploadedAt.toISOString() });
});

router.delete(
  "/quotes/:id/drawings/:drawingId",
  async (req, res): Promise<void> => {
    const drawingId = parseInt(
      Array.isArray(req.params.drawingId)
        ? req.params.drawingId[0]
        : req.params.drawingId,
      10,
    );
    if (isNaN(drawingId)) {
      res.status(400).json({ error: "Invalid drawingId" });
      return;
    }
    const [deleted] = await db
      .delete(quoteDrawingsTable)
      .where(eq(quoteDrawingsTable.id, drawingId))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Drawing not found" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
