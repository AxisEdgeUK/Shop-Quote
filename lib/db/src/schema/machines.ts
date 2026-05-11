import { pgTable, serial, text, boolean, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const machinesTable = pgTable("machines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  machineType: text("machine_type").notNull().default("Milling"),
  axisCount: integer("axis_count").notNull().default(3),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }).notNull().default("65"),
  setupRate: numeric("setup_rate", { precision: 10, scale: 2 }).notNull().default("65"),
  notes: text("notes").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMachineSchema = createInsertSchema(machinesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type Machine = typeof machinesTable.$inferSelect;
