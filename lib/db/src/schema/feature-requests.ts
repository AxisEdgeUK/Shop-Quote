import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const featureRequestsTable = pgTable("feature_requests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("Other"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type FeatureRequest = typeof featureRequestsTable.$inferSelect;
export type InsertFeatureRequest = typeof featureRequestsTable.$inferInsert;
