import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { machinesTable } from "./machines";

export const quotesTable = pgTable("quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: text("quote_number").notNull(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id),
  status: text("status").notNull().default("Draft"),
  lostReason: text("lost_reason").notNull().default(""),
  lostDate: text("lost_date"),
  lostNotes: text("lost_notes").notNull().default(""),
  wonDate: text("won_date"),
  wonNotes: text("won_notes").notNull().default(""),
  poNumber: text("po_number").notNull().default(""),
  expectedDelivery: text("expected_delivery").notNull().default(""),
  quoteDate: text("quote_date").notNull(),
  validUntil: text("valid_until").notNull(),
  quoteRevision: text("quote_revision").notNull().default("A"),
  revisionNotes: text("revision_notes").notNull().default(""),
  leadTime: text("lead_time").notNull().default(""),
  deliveryTerms: text("delivery_terms").notNull().default(""),
  notes: text("notes").notNull().default(""),
  internalNotes: text("internal_notes").notNull().default(""),
  paymentTerms: text("payment_terms")
    .notNull()
    .default("30 days from invoice date"),
  termsAndConditions: text("terms_and_conditions").notNull().default(""),
  materialCertIncluded: boolean("material_cert_included")
    .notNull()
    .default(false),
  inspectionReportIncluded: boolean("inspection_report_included")
    .notNull()
    .default(false),
  fairIncluded: boolean("fair_included").notNull().default(false),
  cmmReportIncluded: boolean("cmm_report_included").notNull().default(false),
  priceBreakQtys: text("price_break_qtys").notNull().default(""),
  deliveryMethod: text("delivery_method").notNull().default(""),
  deliveryCost: numeric("delivery_cost", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  includeDeliveryInTotal: boolean("include_delivery_in_total")
    .notNull()
    .default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const quoteLineItemsTable = pgTable("quote_line_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id")
    .notNull()
    .references(() => quotesTable.id, { onDelete: "cascade" }),
  partName: text("part_name").notNull(),
  drawingNumber: text("drawing_number").notNull().default(""),
  revision: text("revision").notNull().default(""),
  quantity: integer("quantity").notNull().default(1),
  material: text("material").notNull().default(""),
  processType: text("process_type").notNull().default("Milling"),
  machineId: integer("machine_id").references(() => machinesTable.id),
  toleranceClass: text("tolerance_class").notNull().default("Standard"),
  surfaceFinish: text("surface_finish").notNull().default("Standard"),
  complexity: text("complexity").notNull().default("Medium"),
  // Inputs
  setupHours: numeric("setup_hours", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  programmingHours: numeric("programming_hours", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  machiningMinutesPerPart: numeric("machining_minutes_per_part", {
    precision: 10,
    scale: 4,
  })
    .notNull()
    .default("0"),
  inspectionHours: numeric("inspection_hours", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  deburringMinutesPerPart: numeric("deburring_minutes_per_part", {
    precision: 10,
    scale: 4,
  })
    .notNull()
    .default("0"),
  materialCostPerUnit: numeric("material_cost_per_unit", {
    precision: 10,
    scale: 4,
  })
    .notNull()
    .default("0"),
  materialWastagePercentage: numeric("material_wastage_percentage", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("0"),
  toolingAllowance: numeric("tooling_allowance", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  outsideProcessing: numeric("outside_processing", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  packaging: numeric("packaging", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  delivery: numeric("delivery", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  riskPercentage: numeric("risk_percentage", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  profitMarginPercentage: numeric("profit_margin_percentage", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("30"),
  discountPercentage: numeric("discount_percentage", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  vatEnabled: boolean("vat_enabled").notNull().default(false),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("20"),
  // Effective rates snapshot — stored at quote time so price breaks are always correct
  machineHourlyRate: numeric("machine_hourly_rate", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  machineSetupRate: numeric("machine_setup_rate", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  // Calculated outputs
  setupCost: numeric("setup_cost", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  programmingCost: numeric("programming_cost", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  machiningCost: numeric("machining_cost", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  inspectionCost: numeric("inspection_cost", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  deburringCost: numeric("deburring_cost", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  materialCostTotal: numeric("material_cost_total", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  directCost: numeric("direct_cost", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  riskValue: numeric("risk_value", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  costBeforeMargin: numeric("cost_before_margin", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  sellPrice: numeric("sell_price", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  pricePerPart: numeric("price_per_part", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  vatAmount: numeric("vat_amount", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  totalIncVat: numeric("total_inc_vat", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  // Recommendations
  toolingRecommendation: text("tooling_recommendation").notNull().default(""),
  materialRecommendation: text("material_recommendation").notNull().default(""),
  coolantRecommendation: text("coolant_recommendation").notNull().default(""),
  // Workflow flags
  lineItemType: text("line_item_type").notNull().default("standard"),
  hiddenFromPdf: boolean("hidden_from_pdf").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const quoteDrawingsTable = pgTable("quote_drawings", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id")
    .notNull()
    .references(() => quotesTable.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  objectPath: text("object_path").notNull(),
  drawingNumber: text("drawing_number").notNull().default(""),
  revision: text("revision").notNull().default(""),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertQuoteLineItemSchema = createInsertSchema(
  quoteLineItemsTable,
).omit({ id: true, createdAt: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type InsertQuoteLineItem = z.infer<typeof insertQuoteLineItemSchema>;
export type Quote = typeof quotesTable.$inferSelect;
export type QuoteLineItem = typeof quoteLineItemsTable.$inferSelect;
export type QuoteDrawing = typeof quoteDrawingsTable.$inferSelect;
