import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  CreateCustomerBody,
  GetCustomerParams,
  GetCustomerResponse,
  UpdateCustomerParams,
  UpdateCustomerBody,
  UpdateCustomerResponse,
  DeleteCustomerParams,
  ListCustomersResponse,
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

router.get("/customers", async (req, res): Promise<void> => {
  const showArchived = req.query.archived === "true";
  const customers = await db
    .select()
    .from(customersTable)
    .where(showArchived ? undefined : eq(customersTable.active, true))
    .orderBy(customersTable.companyName);
  res.json(
    ListCustomersResponse.parse(
      customers.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [customer] = await db
    .insert(customersTable)
    .values({
      companyName: parsed.data.companyName,
      contactName: parsed.data.contactName ?? "",
      email: parsed.data.email ?? "",
      phone: parsed.data.phone ?? "",
      address: parsed.data.address ?? "",
      notes: parsed.data.notes ?? "",
      active: true,
    })
    .returning();
  res.status(201).json(
    GetCustomerResponse.parse({
      ...customer,
      createdAt: customer.createdAt.toISOString(),
    }),
  );
});

router.patch("/customers/bulk/archive", async (req, res): Promise<void> => {
  const ids = parseBulkIds(req.body);
  if (!ids) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }
  await db
    .update(customersTable)
    .set({ active: false })
    .where(inArray(customersTable.id, ids));
  res.json({ archived: ids.length });
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetCustomerParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, params.data.id));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(
    GetCustomerResponse.parse({
      ...customer,
      createdAt: customer.createdAt.toISOString(),
    }),
  );
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateCustomerParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [customer] = await db
    .update(customersTable)
    .set(parsed.data)
    .where(eq(customersTable.id, params.data.id))
    .returning();
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(
    UpdateCustomerResponse.parse({
      ...customer,
      createdAt: customer.createdAt.toISOString(),
    }),
  );
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteCustomerParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [customer] = await db
    .delete(customersTable)
    .where(eq(customersTable.id, params.data.id))
    .returning();
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
