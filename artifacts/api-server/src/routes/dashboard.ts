import { Router, type IRouter } from "express";
import { db, quotesTable, quoteLineItemsTable } from "@workspace/db";
import { GetDashboardStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = nextMonthDate.toISOString().split("T")[0];

  const quotes = await db
    .select({
      status: quotesTable.status,
      validUntil: quotesTable.validUntil,
      id: quotesTable.id,
      wonDate: quotesTable.wonDate,
      lostDate: quotesTable.lostDate,
      rfqReceivedDate: quotesTable.rfqReceivedDate,
      quoteSentDate: quotesTable.quoteSentDate,
    })
    .from(quotesTable);

  const lineItems = await db
    .select({
      quoteId: quoteLineItemsTable.quoteId,
      sellPrice: quoteLineItemsTable.sellPrice,
    })
    .from(quoteLineItemsTable);

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
  let wonThisMonth = 0;
  let lostThisMonth = 0;
  let wonValueThisMonth = 0;
  let lostValueThisMonth = 0;

  for (const quote of quotes) {
    totalQuotes++;
    const value = quoteTotals.get(quote.id) ?? 0;
    totalQuotedValue += value;

    switch (quote.status) {
      case "Draft":
        draftQuotes++;
        break;
      case "Sent":
        sentQuotes++;
        if (quote.validUntil < today) followUpNeeded++;
        break;
      case "Won":
        wonQuotes++;
        wonValue += value;
        if (
          quote.wonDate &&
          quote.wonDate >= monthStart &&
          quote.wonDate < monthEnd
        ) {
          wonThisMonth++;
          wonValueThisMonth += value;
        }
        break;
      case "Lost":
        lostQuotes++;
        if (
          quote.lostDate &&
          quote.lostDate >= monthStart &&
          quote.lostDate < monthEnd
        ) {
          lostThisMonth++;
          lostValueThisMonth += value;
        }
        break;
      case "Expired":
        expiredQuotes++;
        break;
    }
  }

  const sentAndWon = wonQuotes + lostQuotes;
  const conversionRate = sentAndWon > 0 ? (wonQuotes / sentAndWon) * 100 : 0;
  const avgWonValue = wonQuotes > 0 ? wonValue / wonQuotes : 0;

  const turnaroundDays: number[] = [];
  for (const quote of quotes) {
    if (
      quote.rfqReceivedDate &&
      quote.quoteSentDate &&
      quote.rfqReceivedDate <= quote.quoteSentDate
    ) {
      const diff =
        (new Date(quote.quoteSentDate).getTime() -
          new Date(quote.rfqReceivedDate).getTime()) /
        86400000;
      if (diff >= 0 && diff < 365) turnaroundDays.push(diff);
    }
  }
  const avgTurnaroundDays =
    turnaroundDays.length > 0
      ? turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length
      : 0;

  res.json(
    GetDashboardStatsResponse.parse({
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
      wonThisMonth,
      lostThisMonth,
      wonValueThisMonth,
      lostValueThisMonth,
      avgWonValue,
      avgTurnaroundDays,
    }),
  );
});

export default router;
