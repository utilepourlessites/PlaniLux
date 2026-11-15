import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "Connexion requise." }, { status: 401 });

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return unauthorized();

    // 1. Supprimer tous les plannings de l'utilisateur
    const { error: boardsError } = await supabase
      .from("planner_boards")
      .delete()
      .eq("user_id", user.id);

    if (boardsError) {
      console.error("Erreur suppression planner_boards:", boardsError);
      return NextResponse.json({ error: "Impossible de supprimer les tableaux." }, { status: 500 });
    }

    // 2. Supprimer la ligne de profil
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) {
      console.error("Erreur suppression profile:", profileError);
      return NextResponse.json({ error: "Impossible de supprimer le profil." }, { status: 500 });
    }

    // 3. Supprimer définitivement l'utilisateur auth.users via Supabase Admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY manquant pour la suppression du compte auth.");
      return NextResponse.json(
        { error: "Configuration serveur incomplète (SUPABASE_SERVICE_ROLE_KEY requis pour la suppression complète du compte)." },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: adminDeleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (adminDeleteError) {
      console.error("Erreur admin.deleteUser:", adminDeleteError);
      return NextResponse.json(
        { error: "Échec de la suppression définitive du compte d'authentification." },
        { status: 500 }
      );
    }

    // 4. Déconnexion de la session courante
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete account data", error);
    return NextResponse.json({ error: "Impossible de supprimer le compte." }, { status: 500 });
  }
}
