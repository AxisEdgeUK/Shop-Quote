import { pgTable, serial, text, boolean, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default(""),
  address: text("address").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  website: text("website").notNull().default(""),
  vatNumber: text("vat_number").notNull().default(""),
  currency: text("currency").notNull().default("GBP"),
  logoUrl: text("logo_url").notNull().default(""),
  // Bank details
  bankName: text("bank_name").notNull().default(""),
  accountName: text("account_name").notNull().default(""),
  accountNumber: text("account_number").notNull().default(""),
  sortCode: text("sort_code").notNull().default(""),
  iban: text("iban").notNull().default(""),
  swiftBic: text("swift_bic").notNull().default(""),
  showBankDetails: boolean("show_bank_details").notNull().default(false),
  // Quoting defaults
  defaultHourlyRate: numeric("default_hourly_rate", { precision: 10, scale: 2 }).notNull().default("65"),
  defaultSetupRate: numeric("default_setup_rate", { precision: 10, scale: 2 }).notNull().default("65"),
  defaultMarginPercentage: numeric("default_margin_percentage", { precision: 5, scale: 2 }).notNull().default("30"),
  vatEnabled: boolean("vat_enabled").notNull().default(false),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("20"),
  quoteValidityDays: integer("quote_validity_days").notNull().default(30),
  defaultLeadTime: text("default_lead_time").notNull().default(""),
  defaultDeliveryTerms: text("default_delivery_terms").notNull().default("Ex Works"),
  paymentTerms: text("payment_terms").notNull().default("30 days from invoice date"),
  termsAndConditions: text("terms_and_conditions").notNull().default("All prices quoted are exclusive of VAT unless stated. Prices are valid for the period stated on the quote. Orders are accepted subject to these terms and conditions."),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
