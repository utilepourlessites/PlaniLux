import type { BoardKind, PlannerBoard, ScheduleEvent } from "./planner-types";

export type BoardRow = {
  id: string;
  title: string;
  kind: string;
  color: string;
  events: unknown;
  favorite: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export function rowToBoard(row: BoardRow): PlannerBoard {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind as BoardKind,
    color: row.color,
    events: (Array.isArray(row.events) ? row.events : []) as ScheduleEvent[],
    favorite: row.favorite,
    isDeleted: row.is_deleted,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
