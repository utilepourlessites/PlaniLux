import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "Connexion requise." }, { status: 401 });

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    // 1. Supprimer tous les plannings de l'utilisateur
    await supabase.from("planner_boards").delete().eq("user_id", user.id);

    // 2. Supprimer la ligne de profil
    await supabase.from("profiles").delete().eq("id", user.id);

    // 3. Déconnexion
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete account data", error);
    return NextResponse.json({ error: "Impossible de supprimer le compte." }, { status: 500 });
  }
}
