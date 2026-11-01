import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UUID_REGEX, validateBoardPatch } from "@/lib/board-validation";
import { rowToBoard, type BoardRow } from "@/lib/board-mapper";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const unauthorized = () => NextResponse.json({ error: "Connexion requise." }, { status: 401 });

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) return NextResponse.json({ error: "Identifiant de tableau invalide." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
    const parsed = validateBoardPatch(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { isDeleted, ...rest } = parsed.value;
    const update = { ...rest, ...(isDeleted !== undefined ? { is_deleted: isDeleted } : {}) };
    if (Object.keys(update).length === 0) return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });

    // La RLS limite déjà la mise à jour aux tableaux de l'utilisateur ; le filtre user_id est une double sécurité.
    const { data, error } = await supabase
      .from("planner_boards")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Tableau introuvable." }, { status: 404 });
    return NextResponse.json(rowToBoard(data as BoardRow));
  } catch (error) {
    console.error("Unable to update planner board", error);
    return NextResponse.json({ error: "Impossible de modifier le tableau." }, { status: 500 });
  }
}

/** Suppression définitive (la mise à la corbeille passe par PATCH { isDeleted: true }). */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) return NextResponse.json({ error: "Identifiant de tableau invalide." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data, error } = await supabase
      .from("planner_boards")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Tableau introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete planner board", error);
    return NextResponse.json({ error: "Impossible de supprimer le tableau." }, { status: 500 });
  }
}
