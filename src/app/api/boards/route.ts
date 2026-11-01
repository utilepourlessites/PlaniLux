import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { makeDefaultBoards } from "@/lib/templates";
import { validateBoardCreate } from "@/lib/board-validation";
import { rowToBoard, type BoardRow } from "@/lib/board-mapper";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "Connexion requise." }, { status: 401 });

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    // Première connexion : on crée les tableaux d'exemple pour CET utilisateur, une seule fois.
    // La mise à jour conditionnelle est atomique : deux requêtes simultanées ne sèment qu'une fois.
    const { data: claimed } = await supabase
      .from("profiles")
      .update({ boards_seeded: true })
      .eq("id", user.id)
      .eq("boards_seeded", false)
      .select("id");
    if (claimed && claimed.length > 0) {
      const seeds = makeDefaultBoards().map((board) => ({
        user_id: user.id,
        title: board.title,
        kind: board.kind,
        color: board.color,
        events: board.events,
        favorite: board.favorite,
        is_deleted: false,
      }));
      const { error: seedError } = await supabase.from("planner_boards").insert(seeds);
      if (seedError) {
        console.error("Unable to seed planner boards", seedError);
        await supabase.from("profiles").update({ boards_seeded: false }).eq("id", user.id);
      }
    }

    const { data, error } = await supabase
      .from("planner_boards")
      .select("*")
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
