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

export const materialsTable = pgTable("materials", {
  id: serial("id").primaryKey(),
  material: text("material").notNull(),
  grade: text("grade").notNull(),
  form: text("form").notNull().default(""),
  costPerKg: numeric("cost_per_kg", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  density: numeric("density", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  supplier: text("supplier").notNull().default(""),
  defaultStockAllowance: numeric("default_stock_allowance", {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default("10"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertMaterialSchema = createInsertSchema(materialsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materialsTable.$inferSelect;
