import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateBoardCreate } from "@/lib/board-validation";
import { rowToBoard, type BoardRow } from "@/lib/board-mapper";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "Connexion requise." }, { status: 401 });

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data, error } = await supabase
      .from("planner_boards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json((data as BoardRow[]).map(rowToBoard));
  } catch (error) {
    console.error("Unable to load planner boards", error);
    return NextResponse.json({ error: "Impossible de charger les tableaux." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
    const parsed = validateBoardCreate(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { id, title, kind, color, events, favorite } = parsed.value;
    const { data, error } = await supabase
      .from("planner_boards")
      .insert({ ...(id ? { id } : {}), user_id: user.id, title, kind, color, events, favorite, is_deleted: false })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Ce tableau existe déjà." }, { status: 409 });
      throw error;
    }
    return NextResponse.json(rowToBoard(data as BoardRow), { status: 201 });
  } catch (error) {
    console.error("Unable to create planner board", error);
    return NextResponse.json({ error: "Impossible de créer le tableau." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { error } = await supabase
      .from("planner_boards")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to clear planner boards", error);
    return NextResponse.json({ error: "Impossible de réinitialiser les tableaux." }, { status: 500 });
  }
}
