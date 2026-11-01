import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { plannerBoards } from "@/db/schema";
import { makeDefaultBoards } from "@/lib/templates";
import type { BoardKind, PlannerBoard, ScheduleEvent } from "@/lib/planner-types";

export const dynamic = "force-dynamic";

function serialize(row: typeof plannerBoards.$inferSelect): PlannerBoard {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    events: row.events as ScheduleEvent[],
    kind: row.kind as BoardKind,
  };
}

export async function GET() {
  try {
    let rows = await db.select().from(plannerBoards).orderBy(asc(plannerBoards.createdAt));
    if (rows.length === 0) {
      const defaults = makeDefaultBoards();
      await db.insert(plannerBoards).values(defaults.map((board) => ({
        id: board.id,
        title: board.title,
        kind: board.kind,
        color: board.color,
        events: board.events,
        favorite: board.favorite,
        isDeleted: board.isDeleted,
        createdAt: new Date(board.createdAt),
        updatedAt: new Date(board.updatedAt),
      }))).onConflictDoNothing();
      rows = await db.select().from(plannerBoards).orderBy(asc(plannerBoards.createdAt));
    }
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    console.error("Unable to load planner boards", error);
    return NextResponse.json({ error: "Impossible de charger les tableaux." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<PlannerBoard>;
    if (!body.title?.trim() || !body.kind) {
      return NextResponse.json({ error: "Un titre et un modèle sont requis." }, { status: 400 });
    }
    const validId = typeof body.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id) ? body.id : undefined;
    const [row] = await db.insert(plannerBoards).values({
      ...(validId ? { id: validId } : {}),
      title: body.title.trim().slice(0, 100),
      kind: body.kind,
      color: body.color || "#c6b8f5",
      events: body.events || [],
      favorite: Boolean(body.favorite),
      isDeleted: false,
    }).returning();
    return NextResponse.json(serialize(row), { status: 201 });
  } catch (error) {
    console.error("Unable to create planner board", error);
    return NextResponse.json({ error: "Impossible de créer le tableau." }, { status: 500 });
  }
}
