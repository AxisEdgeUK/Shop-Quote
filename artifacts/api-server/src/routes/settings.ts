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
  const [settings] = await db
    .insert(settingsTable)
    .values({
      companyName: "Your Company Name",
    })
    .returning();
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
  const d = parsed.data;
  const updateData: Record<string, unknown> = {};

  // Company details
  if (d.companyName !== undefined) updateData.companyName = d.companyName;
  if (d.address !== undefined) updateData.address = d.address;
  if (d.email !== undefined) updateData.email = d.email;
  if (d.phone !== undefined) updateData.phone = d.phone;
  if (d.website !== undefined) updateData.website = d.website;
  if (d.vatNumber !== undefined) updateData.vatNumber = d.vatNumber;
  if (d.currency !== undefined) updateData.currency = d.currency;
  if (d.logoUrl !== undefined) updateData.logoUrl = d.logoUrl;

  // Bank details
  if (d.bankName !== undefined) updateData.bankName = d.bankName;
  if (d.accountName !== undefined) updateData.accountName = d.accountName;
  if (d.accountNumber !== undefined) updateData.accountNumber = d.accountNumber;
  if (d.sortCode !== undefined) updateData.sortCode = d.sortCode;
  if (d.iban !== undefined) updateData.iban = d.iban;
  if (d.swiftBic !== undefined) updateData.swiftBic = d.swiftBic;
  if (d.showBankDetails !== undefined)
    updateData.showBankDetails = d.showBankDetails;

  // Quoting defaults
  if (d.defaultHourlyRate !== undefined)
    updateData.defaultHourlyRate = String(d.defaultHourlyRate);
  if (d.defaultSetupRate !== undefined)
    updateData.defaultSetupRate = String(d.defaultSetupRate);
  if (d.defaultMarginPercentage !== undefined)
    updateData.defaultMarginPercentage = String(d.defaultMarginPercentage);
  if (d.vatEnabled !== undefined) updateData.vatEnabled = d.vatEnabled;
  if (d.vatRate !== undefined) updateData.vatRate = String(d.vatRate);
  if (d.quoteValidityDays !== undefined)
    updateData.quoteValidityDays = d.quoteValidityDays;
  if (d.defaultLeadTime !== undefined)
    updateData.defaultLeadTime = d.defaultLeadTime;
  if (d.defaultDeliveryTerms !== undefined)
    updateData.defaultDeliveryTerms = d.defaultDeliveryTerms;
  if (d.paymentTerms !== undefined) updateData.paymentTerms = d.paymentTerms;
  if (d.termsAndConditions !== undefined)
    updateData.termsAndConditions = d.termsAndConditions;

  const { eq } = await import("drizzle-orm");
  const [settings] = await db
    .update(settingsTable)
    .set(updateData)
    .where(eq(settingsTable.id, existing.id))
    .returning();
  res.json(UpdateSettingsResponse.parse(parseSettings(settings)));
});

export default router;
