import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { plannerBoards } from "@/db/schema";
import type { PlannerBoard } from "@/lib/planner-types";

type RouteContext = { params: Promise<{ id: string }> };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Identifiant de tableau invalide." }, { status: 400 });
    }
    const body = await request.json() as Partial<PlannerBoard>;
    const update: Partial<typeof plannerBoards.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.title === "string") update.title = body.title.trim().slice(0, 100);
    if (body.kind) update.kind = body.kind;
    if (body.color) update.color = body.color;
    if (body.events) update.events = body.events;
    if (typeof body.favorite === "boolean") update.favorite = body.favorite;
    if (typeof body.isDeleted === "boolean") update.isDeleted = body.isDeleted;
    const [row] = await db.update(plannerBoards).set(update).where(eq(plannerBoards.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Tableau introuvable." }, { status: 404 });
    return NextResponse.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (error) {
    console.error("Unable to update planner board", error);
    return NextResponse.json({ error: "Impossible de modifier le tableau." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Identifiant de tableau invalide." }, { status: 400 });
    }
    const [row] = await db.delete(plannerBoards).where(eq(plannerBoards.id, id)).returning({ id: plannerBoards.id });
    if (!row) return NextResponse.json({ error: "Tableau introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to archive planner board", error);
    return NextResponse.json({ error: "Impossible de déplacer le tableau." }, { status: 500 });
  }
}
