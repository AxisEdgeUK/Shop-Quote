import { Router } from "express";
import { db, featureRequestsTable } from "@workspace/db";

const router = Router();

router.post("/feature-requests", async (req, res) => {
  const {
    title = "",
    description = "",
    category = "Other",
  } = req.body as Record<string, string>;

  if (!title.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  try {
    const [row] = await db
      .insert(featureRequestsTable)
      .values({ title: title.trim(), description, category })
      .returning({ id: featureRequestsTable.id });

    req.log.info({ id: row?.id }, "feature request submitted");
    res.status(201).json({ id: row?.id });
  } catch (err) {
    req.log.error({ err }, "failed to save feature request");
    res.status(500).json({ error: "Failed to save feature request" });
  }
});

router.get("/feature-requests", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(featureRequestsTable)
      .orderBy(featureRequestsTable.createdAt);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feature requests" });
  }
});

export default router;
