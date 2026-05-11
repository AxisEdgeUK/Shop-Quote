import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, machinesTable } from "@workspace/db";
import {
  CreateMachineBody,
  GetMachineParams,
  GetMachineResponse,
  UpdateMachineParams,
  UpdateMachineBody,
  UpdateMachineResponse,
  DeleteMachineParams,
  ListMachinesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/machines", async (req, res): Promise<void> => {
  const machines = await db.select().from(machinesTable).orderBy(machinesTable.name);
  res.json(ListMachinesResponse.parse(machines.map(m => ({
    ...m,
    hourlyRate: parseFloat(m.hourlyRate),
    setupRate: parseFloat(m.setupRate),
    createdAt: m.createdAt.toISOString(),
  }))));
});

router.post("/machines", async (req, res): Promise<void> => {
  const parsed = CreateMachineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [machine] = await db.insert(machinesTable).values({
    name: parsed.data.name,
    machineType: parsed.data.machineType ?? "Milling",
    axisCount: parsed.data.axisCount ?? 3,
    hourlyRate: String(parsed.data.hourlyRate),
    setupRate: String(parsed.data.setupRate),
    notes: parsed.data.notes ?? "",
    active: parsed.data.active ?? true,
  }).returning();
  res.status(201).json(GetMachineResponse.parse({
    ...machine,
    hourlyRate: parseFloat(machine.hourlyRate),
    setupRate: parseFloat(machine.setupRate),
    createdAt: machine.createdAt.toISOString(),
  }));
});

router.get("/machines/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetMachineParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [machine] = await db.select().from(machinesTable).where(eq(machinesTable.id, params.data.id));
  if (!machine) {
    res.status(404).json({ error: "Machine not found" });
    return;
  }
  res.json(GetMachineResponse.parse({
    ...machine,
    hourlyRate: parseFloat(machine.hourlyRate),
    setupRate: parseFloat(machine.setupRate),
    createdAt: machine.createdAt.toISOString(),
  }));
});

router.patch("/machines/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateMachineParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMachineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.hourlyRate !== undefined) updateData.hourlyRate = String(parsed.data.hourlyRate);
  if (parsed.data.setupRate !== undefined) updateData.setupRate = String(parsed.data.setupRate);
  const [machine] = await db.update(machinesTable).set(updateData).where(eq(machinesTable.id, params.data.id)).returning();
  if (!machine) {
    res.status(404).json({ error: "Machine not found" });
    return;
  }
  res.json(UpdateMachineResponse.parse({
    ...machine,
    hourlyRate: parseFloat(machine.hourlyRate),
    setupRate: parseFloat(machine.setupRate),
    createdAt: machine.createdAt.toISOString(),
  }));
});

router.delete("/machines/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteMachineParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [machine] = await db.delete(machinesTable).where(eq(machinesTable.id, params.data.id)).returning();
  if (!machine) {
    res.status(404).json({ error: "Machine not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
