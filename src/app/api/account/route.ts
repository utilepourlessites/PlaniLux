import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "Connexion requise." }, { status: 401 });

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return unauthorized();

    // 1. Supprimer tous les plannings de l'utilisateur
    const { error: boardsError } = await supabase.from("planner_boards").delete().eq("user_id", user.id);
    if (boardsError) {
      console.error("Erreur suppression planner_boards:", boardsError);
      return NextResponse.json({ error: "Impossible de supprimer les plannings." }, { status: 500 });
    }

    // 2. Supprimer la ligne de profil
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", user.id);
    if (profileError) {
      console.error("Erreur suppression profil:", profileError);
      return NextResponse.json({ error: "Impossible de supprimer le profil." }, { status: 500 });
    }

    // 3. Déconnexion de la session
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Erreur déconnexion:", signOutError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete account data", error);
    return NextResponse.json({ error: "Impossible de supprimer le compte." }, { status: 500 });
  }
}
