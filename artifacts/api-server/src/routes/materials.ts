import { Router, type IRouter } from "express";
import { eq, asc, inArray } from "drizzle-orm";
import { db, materialsTable } from "@workspace/db";
import {
  CreateMaterialBody,
  GetMaterialParams,
  GetMaterialResponse,
  UpdateMaterialParams,
  UpdateMaterialBody,
  UpdateMaterialResponse,
  DeleteMaterialParams,
  ListMaterialsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseBulkIds(body: unknown): number[] | null {
  if (!body || typeof body !== "object") return null;
  const { ids } = body as Record<string, unknown>;
  if (!Array.isArray(ids) || ids.length === 0) return null;
  if (!ids.every((x) => typeof x === "number" && Number.isInteger(x) && x > 0))
    return null;
  return ids as number[];
}

function parseMaterial(m: typeof materialsTable.$inferSelect) {
  return {
    ...m,
    costPerKg: parseFloat(m.costPerKg),
    density: parseFloat(m.density),
    defaultStockAllowance: parseFloat(m.defaultStockAllowance),
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/materials", async (req, res): Promise<void> => {
  const materials = await db
    .select()
    .from(materialsTable)
    .orderBy(asc(materialsTable.material), asc(materialsTable.grade));
  res.json(ListMaterialsResponse.parse(materials.map(parseMaterial)));
});

router.post("/materials", async (req, res): Promise<void> => {
  const parsed = CreateMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [material] = await db
    .insert(materialsTable)
    .values({
      material: parsed.data.material,
      grade: parsed.data.grade,
      form: parsed.data.form ?? "",
      costPerKg: String(parsed.data.costPerKg ?? 0),
      density: String(parsed.data.density ?? 0),
      supplier: parsed.data.supplier ?? "",
      defaultStockAllowance: String(parsed.data.defaultStockAllowance ?? 10),
      active: parsed.data.active ?? true,
    })
    .returning();
  res.status(201).json(GetMaterialResponse.parse(parseMaterial(material)));
});

router.patch(
  "/materials/bulk/deactivate",
  async (req, res): Promise<void> => {
    const ids = parseBulkIds(req.body);
    if (!ids) {
      res.status(400).json({ error: "Invalid ids" });
      return;
    }
    await db
      .update(materialsTable)
      .set({ active: false })
      .where(inArray(materialsTable.id, ids));
    res.json({ deactivated: ids.length });
  },
);

router.get("/materials/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetMaterialParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [material] = await db
    .select()
    .from(materialsTable)
    .where(eq(materialsTable.id, params.data.id));
  if (!material) {
    res.status(404).json({ error: "Material not found" });
    return;
  }
  res.json(GetMaterialResponse.parse(parseMaterial(material)));
});

router.patch("/materials/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateMaterialParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.costPerKg !== undefined)
    updateData.costPerKg = String(parsed.data.costPerKg);
  if (parsed.data.density !== undefined)
    updateData.density = String(parsed.data.density);
  if (parsed.data.defaultStockAllowance !== undefined)
    updateData.defaultStockAllowance = String(
      parsed.data.defaultStockAllowance,
    );
  const [material] = await db
    .update(materialsTable)
    .set(updateData)
    .where(eq(materialsTable.id, params.data.id))
    .returning();
  if (!material) {
    res.status(404).json({ error: "Material not found" });
    return;
  }
  res.json(UpdateMaterialResponse.parse(parseMaterial(material)));
});

router.delete("/materials/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteMaterialParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [material] = await db
    .delete(materialsTable)
    .where(eq(materialsTable.id, params.data.id))
    .returning();
  if (!material) {
    res.status(404).json({ error: "Material not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
