import { Router } from "express";
import { db, chargeableExtrasTable } from "@workspace/db";
import { eq, ilike, or, inArray } from "drizzle-orm";

export const extrasRouter = Router();

function parseBulkIds(body: unknown): number[] | null {
  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as Record<string, unknown>).ids)
  )
    return null;
  const ids = (body as Record<string, unknown>).ids as unknown[];
  if (!ids.every((id) => typeof id === "number" && Number.isInteger(id)))
    return null;
  return ids as number[];
}

function parseExtra(row: typeof chargeableExtrasTable.$inferSelect) {
  return {
    ...row,
    defaultSellPrice: parseFloat(String(row.defaultSellPrice)),
    defaultCost: parseFloat(String(row.defaultCost)),
  };
}

extrasRouter.get("/extras", async (req, res): Promise<void> => {
  const { search, all } = req.query as Record<string, string>;
  const showAll = all === "true";

  let rows;
  if (search) {
    rows = await db
      .select()
      .from(chargeableExtrasTable)
      .where(
        or(
          ilike(chargeableExtrasTable.extraName, `%${search}%`),
          ilike(chargeableExtrasTable.extraCode, `%${search}%`),
          ilike(chargeableExtrasTable.category, `%${search}%`),
        ),
      )
      .orderBy(chargeableExtrasTable.extraName);
  } else if (showAll) {
    rows = await db
      .select()
      .from(chargeableExtrasTable)
      .orderBy(chargeableExtrasTable.extraName);
  } else {
    rows = await db
      .select()
      .from(chargeableExtrasTable)
      .where(eq(chargeableExtrasTable.active, true))
      .orderBy(chargeableExtrasTable.extraName);
  }

  res.json(rows.map(parseExtra));
});

extrasRouter.post("/extras/bulk/deactivate", async (req, res): Promise<void> => {
  const ids = parseBulkIds(req.body);
  if (!ids) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }
  await db
    .update(chargeableExtrasTable)
    .set({ active: false })
    .where(inArray(chargeableExtrasTable.id, ids));
  res.json({ deactivated: ids.length });
});

extrasRouter.delete("/extras/bulk", async (req, res): Promise<void> => {
  const ids = parseBulkIds(req.body);
  if (!ids) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }
  await db
    .delete(chargeableExtrasTable)
    .where(inArray(chargeableExtrasTable.id, ids));
  res.json({ deleted: ids.length });
});

extrasRouter.get("/extras/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select()
    .from(chargeableExtrasTable)
    .where(eq(chargeableExtrasTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(parseExtra(row));
});

extrasRouter.post("/extras", async (req, res): Promise<void> => {
  const {
    extraCode = "",
    extraName,
    category = "",
    unit = "each",
    defaultSellPrice = 0,
    defaultCost = 0,
    notes = "",
    active = true,
  } = req.body as Record<string, unknown>;

  if (!extraName || typeof extraName !== "string") {
    res.status(400).json({ error: "extraName is required" });
    return;
  }

  const [row] = await db
    .insert(chargeableExtrasTable)
    .values({
      extraCode: String(extraCode),
      extraName: String(extraName),
      category: String(category),
      unit: String(unit),
      defaultSellPrice: String(defaultSellPrice),
      defaultCost: String(defaultCost),
      notes: String(notes),
      active: Boolean(active),
    })
    .returning();

  res.status(201).json(parseExtra(row));
});

extrasRouter.patch("/extras/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const {
    extraCode,
    extraName,
    category,
    unit,
    defaultSellPrice,
    defaultCost,
    notes,
    active,
  } = req.body as Record<string, unknown>;

  const updates: Partial<typeof chargeableExtrasTable.$inferInsert> = {};
  if (extraCode !== undefined) updates.extraCode = String(extraCode);
  if (extraName !== undefined) updates.extraName = String(extraName);
  if (category !== undefined) updates.category = String(category);
  if (unit !== undefined) updates.unit = String(unit);
  if (defaultSellPrice !== undefined)
    updates.defaultSellPrice = String(defaultSellPrice);
  if (defaultCost !== undefined) updates.defaultCost = String(defaultCost);
  if (notes !== undefined) updates.notes = String(notes);
  if (active !== undefined) updates.active = Boolean(active);

  const [row] = await db
    .update(chargeableExtrasTable)
    .set(updates)
    .where(eq(chargeableExtrasTable.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(parseExtra(row));
});

extrasRouter.delete("/extras/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(chargeableExtrasTable)
    .where(eq(chargeableExtrasTable.id, id));
  res.json({ deleted: true });
});
