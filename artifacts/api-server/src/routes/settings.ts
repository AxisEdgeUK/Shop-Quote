import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseSettings(s: typeof settingsTable.$inferSelect) {
  return {
    ...s,
    defaultHourlyRate: parseFloat(s.defaultHourlyRate),
    defaultSetupRate: parseFloat(s.defaultSetupRate),
    defaultMarginPercentage: parseFloat(s.defaultMarginPercentage),
    vatRate: parseFloat(s.vatRate),
  };
}

async function ensureSettings() {
  const rows = await db.select().from(settingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [settings] = await db.insert(settingsTable).values({
    companyName: "Your Company Name",
  }).returning();
  return settings;
}

router.get("/settings", async (req, res): Promise<void> => {
  const settings = await ensureSettings();
  res.json(GetSettingsResponse.parse(parseSettings(settings)));
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await ensureSettings();
  const updateData: Record<string, unknown> = {};
  if (parsed.data.companyName !== undefined) updateData.companyName = parsed.data.companyName;
  if (parsed.data.address !== undefined) updateData.address = parsed.data.address;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.website !== undefined) updateData.website = parsed.data.website;
  if (parsed.data.vatNumber !== undefined) updateData.vatNumber = parsed.data.vatNumber;
  if (parsed.data.currency !== undefined) updateData.currency = parsed.data.currency;
  if (parsed.data.defaultHourlyRate !== undefined) updateData.defaultHourlyRate = String(parsed.data.defaultHourlyRate);
  if (parsed.data.defaultSetupRate !== undefined) updateData.defaultSetupRate = String(parsed.data.defaultSetupRate);
  if (parsed.data.defaultMarginPercentage !== undefined) updateData.defaultMarginPercentage = String(parsed.data.defaultMarginPercentage);
  if (parsed.data.vatEnabled !== undefined) updateData.vatEnabled = parsed.data.vatEnabled;
  if (parsed.data.vatRate !== undefined) updateData.vatRate = String(parsed.data.vatRate);
  if (parsed.data.quoteValidityDays !== undefined) updateData.quoteValidityDays = parsed.data.quoteValidityDays;
  if (parsed.data.paymentTerms !== undefined) updateData.paymentTerms = parsed.data.paymentTerms;
  if (parsed.data.termsAndConditions !== undefined) updateData.termsAndConditions = parsed.data.termsAndConditions;

  const { eq } = await import("drizzle-orm");
  const [settings] = await db.update(settingsTable).set(updateData).where(eq(settingsTable.id, existing.id)).returning();
  res.json(UpdateSettingsResponse.parse(parseSettings(settings)));
});

export default router;
