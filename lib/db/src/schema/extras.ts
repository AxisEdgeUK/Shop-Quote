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

export const chargeableExtrasTable = pgTable("chargeable_extras", {
  id: serial("id").primaryKey(),
  extraCode: text("extra_code").notNull().default(""),
  extraName: text("extra_name").notNull(),
  category: text("category").notNull().default(""),
  unit: text("unit").notNull().default("each"),
  defaultSellPrice: numeric("default_sell_price", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  defaultCost: numeric("default_cost", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
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

export const insertChargeableExtraSchema = createInsertSchema(
  chargeableExtrasTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChargeableExtra = z.infer<typeof insertChargeableExtraSchema>;
export type ChargeableExtra = typeof chargeableExtrasTable.$inferSelect;
