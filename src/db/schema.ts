import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { ScheduleEvent } from "@/lib/planner-types";

export const plannerBoards = pgTable("planner_boards", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("school"),
  color: text("color").notNull().default("#c6b8f5"),
  events: jsonb("events").$type<ScheduleEvent[]>().notNull().default([]),
  favorite: boolean("favorite").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
