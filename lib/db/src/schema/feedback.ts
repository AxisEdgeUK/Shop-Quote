import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  workedWell: text("worked_well").notNull().default(""),
  feltSlow: text("felt_slow").notNull().default(""),
  wasConfusing: text("was_confusing").notNull().default(""),
  quoteAccurate: text("quote_accurate").notNull().default(""),
  wouldUseAgain: text("would_use_again").notNull().default(""),
  wouldPay: text("would_pay").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Feedback = typeof feedbackTable.$inferSelect;
export type InsertFeedback = typeof feedbackTable.$inferInsert;
