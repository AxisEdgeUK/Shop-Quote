import { Router } from "express";
import { db, feedbackTable } from "@workspace/db";

const router = Router();

router.post("/feedback", async (req, res) => {
  const {
    workedWell = "",
    feltSlow = "",
    wasConfusing = "",
    quoteAccurate = "",
    wouldUseAgain = "",
    wouldPay = "",
    notes = "",
  } = req.body as Record<string, string>;

  try {
    const [row] = await db
      .insert(feedbackTable)
      .values({ workedWell, feltSlow, wasConfusing, quoteAccurate, wouldUseAgain, wouldPay, notes })
      .returning({ id: feedbackTable.id });

    req.log.info({ id: row?.id }, "beta feedback submitted");
    res.status(201).json({ id: row?.id });
  } catch (err) {
    req.log.error({ err }, "failed to save feedback");
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

router.get("/feedback", async (_req, res) => {
  const rows = await db
    .select()
    .from(feedbackTable)
    .orderBy(feedbackTable.createdAt);
  res.json(rows);
});

export default router;
