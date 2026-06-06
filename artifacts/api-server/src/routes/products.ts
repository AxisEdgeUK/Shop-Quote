import { Router } from "express";
import { db, standardProductsTable } from "@workspace/db";
import { eq, ilike, or, inArray } from "drizzle-orm";

export const productsRouter = Router();

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

function parseProduct(row: typeof standardProductsTable.$inferSelect) {
  return {
    ...row,
    defaultSellPrice: parseFloat(String(row.defaultSellPrice)),
    defaultCost: parseFloat(String(row.defaultCost)),
  };
}

productsRouter.get("/products", async (req, res): Promise<void> => {
  const { search, all } = req.query as Record<string, string>;
  const showAll = all === "true";

  let rows;
  if (search) {
    rows = await db
      .select()
      .from(standardProductsTable)
      .where(
        or(
          ilike(standardProductsTable.productName, `%${search}%`),
          ilike(standardProductsTable.productCode, `%${search}%`),
          ilike(standardProductsTable.category, `%${search}%`),
          ilike(standardProductsTable.material, `%${search}%`),
        ),
      )
      .orderBy(standardProductsTable.productName);
  } else if (showAll) {
    rows = await db
      .select()
      .from(standardProductsTable)
      .orderBy(standardProductsTable.productName);
  } else {
    rows = await db
      .select()
      .from(standardProductsTable)
      .where(eq(standardProductsTable.active, true))
      .orderBy(standardProductsTable.productName);
  }

  res.json(rows.map(parseProduct));
});

productsRouter.post(
  "/products/bulk/deactivate",
  async (req, res): Promise<void> => {
    const ids = parseBulkIds(req.body);
    if (!ids) {
      res.status(400).json({ error: "Invalid ids" });
      return;
    }
    await db
      .update(standardProductsTable)
      .set({ active: false })
      .where(inArray(standardProductsTable.id, ids));
    res.json({ deactivated: ids.length });
  },
);

productsRouter.delete("/products/bulk", async (req, res): Promise<void> => {
  const ids = parseBulkIds(req.body);
  if (!ids) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }
  await db
    .delete(standardProductsTable)
    .where(inArray(standardProductsTable.id, ids));
  res.json({ deleted: ids.length });
});

productsRouter.get("/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select()
    .from(standardProductsTable)
    .where(eq(standardProductsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(parseProduct(row));
});

productsRouter.post("/products", async (req, res): Promise<void> => {
  const {
    productCode = "",
    productName,
    category = "",
    material = "",
    standardSize = "",
    unit = "each",
    defaultSellPrice = 0,
    defaultCost = 0,
    defaultLeadTime = "",
    notes = "",
    active = true,
  } = req.body as Record<string, unknown>;

  if (!productName || typeof productName !== "string") {
    res.status(400).json({ error: "productName is required" });
    return;
  }

  const [row] = await db
    .insert(standardProductsTable)
    .values({
      productCode: String(productCode),
      productName: String(productName),
      category: String(category),
      material: String(material),
      standardSize: String(standardSize),
      unit: String(unit),
      defaultSellPrice: String(defaultSellPrice),
      defaultCost: String(defaultCost),
      defaultLeadTime: String(defaultLeadTime),
      notes: String(notes),
      active: Boolean(active),
    })
    .returning();

  res.status(201).json(parseProduct(row));
});

productsRouter.patch("/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const {
    productCode,
    productName,
    category,
    material,
    standardSize,
    unit,
    defaultSellPrice,
    defaultCost,
    defaultLeadTime,
    notes,
    active,
  } = req.body as Record<string, unknown>;

  const updates: Partial<typeof standardProductsTable.$inferInsert> = {};
  if (productCode !== undefined) updates.productCode = String(productCode);
  if (productName !== undefined) updates.productName = String(productName);
  if (category !== undefined) updates.category = String(category);
  if (material !== undefined) updates.material = String(material);
  if (standardSize !== undefined) updates.standardSize = String(standardSize);
  if (unit !== undefined) updates.unit = String(unit);
  if (defaultSellPrice !== undefined)
    updates.defaultSellPrice = String(defaultSellPrice);
  if (defaultCost !== undefined) updates.defaultCost = String(defaultCost);
  if (defaultLeadTime !== undefined)
    updates.defaultLeadTime = String(defaultLeadTime);
  if (notes !== undefined) updates.notes = String(notes);
  if (active !== undefined) updates.active = Boolean(active);

  const [row] = await db
    .update(standardProductsTable)
    .set(updates)
    .where(eq(standardProductsTable.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(parseProduct(row));
});

productsRouter.delete("/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(standardProductsTable)
    .where(eq(standardProductsTable.id, id));
  res.json({ deleted: true });
});
