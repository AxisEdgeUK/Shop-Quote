import {
  pgTable,
  serial,
  text,
  boolean,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const standardProductsTable = pgTable("standard_products", {
  id: serial("id").primaryKey(),
  productCode: text("product_code").notNull().default(""),
  productName: text("product_name").notNull(),
  category: text("category").notNull().default(""),
  material: text("material").notNull().default(""),
  standardSize: text("standard_size").notNull().default(""),
  unit: text("unit").notNull().default("each"),
  defaultSellPrice: numeric("default_sell_price", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  defaultCost: numeric("default_cost", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  defaultLeadTime: text("default_lead_time").notNull().default(""),
  notes: text("notes").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertStandardProductSchema = createInsertSchema(
  standardProductsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStandardProduct = z.infer<typeof insertStandardProductSchema>;
export type StandardProduct = typeof standardProductsTable.$inferSelect;
