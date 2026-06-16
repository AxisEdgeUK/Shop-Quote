import {
  boolean,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  notes: text("notes").notNull().default(""),
  active: boolean("active").notNull().default(true),
  materialCertRequired: boolean("material_cert_required")
    .notNull()
    .default(false),
  inspectionReportRequired: boolean("inspection_report_required")
    .notNull()
    .default(false),
  fairRequired: boolean("fair_required").notNull().default(false),
  cocRequired: boolean("coc_required").notNull().default(false),
  specialPackagingRequired: boolean("special_packaging_required")
    .notNull()
    .default(false),
  defaultPaymentTerms: text("default_payment_terms").notNull().default(""),
  typicalMarginPct: numeric("typical_margin_pct", {
    precision: 5,
    scale: 2,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
