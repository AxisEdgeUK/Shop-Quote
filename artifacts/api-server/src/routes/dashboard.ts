import { Router, type IRouter } from "express";
import { sql, eq, and, lt } from "drizzle-orm";
import { db, quotesTable, quoteLineItemsTable } from "@workspace/db";
import { GetDashboardStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const quotes = await db.select({
    status: quotesTable.status,
    validUntil: quotesTable.validUntil,
    id: quotesTable.id,
  }).from(quotesTable);

  const lineItems = await db.select({
    quoteId: quoteLineItemsTable.quoteId,
    sellPrice: quoteLineItemsTable.sellPrice,
  }).from(quoteLineItemsTable);

  // Sum sell prices per quote
  const quoteTotals = new Map<number, number>();
  for (const item of lineItems) {
    const current = quoteTotals.get(item.quoteId) ?? 0;
    quoteTotals.set(item.quoteId, current + parseFloat(item.sellPrice));
  }

  let totalQuotes = 0;
  let draftQuotes = 0;
  let sentQuotes = 0;
  let wonQuotes = 0;
  let lostQuotes = 0;
  let expiredQuotes = 0;
  let totalQuotedValue = 0;
  let wonValue = 0;
  let followUpNeeded = 0;

  for (const quote of quotes) {
    totalQuotes++;
    const value = quoteTotals.get(quote.id) ?? 0;
    totalQuotedValue += value;

    switch (quote.status) {
      case "Draft": draftQuotes++; break;
      case "Sent":
        sentQuotes++;
        if (quote.validUntil < today) followUpNeeded++;
        break;
      case "Won":
        wonQuotes++;
        wonValue += value;
        break;
      case "Lost": lostQuotes++; break;
      case "Expired": expiredQuotes++; break;
    }
  }

  const sentAndWon = wonQuotes + lostQuotes;
  const conversionRate = sentAndWon > 0 ? (wonQuotes / sentAndWon) * 100 : 0;

  res.json(GetDashboardStatsResponse.parse({
    totalQuotes,
    draftQuotes,
    sentQuotes,
    wonQuotes,
    lostQuotes,
    expiredQuotes,
    totalQuotedValue,
    wonValue,
    conversionRate,
    followUpNeeded,
  }));
});

export default router;
