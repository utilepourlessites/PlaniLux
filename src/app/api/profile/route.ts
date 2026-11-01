import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateProfileUpdate } from "@/lib/board-validation";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "Connexion requise." }, { status: 401 });

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, workspace_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    const fallbackName = user.user_metadata?.full_name || (user.email ? user.email.split("@")[0] : "");
    const displayName = data?.display_name || fallbackName || "";
    const workspaceName = data?.workspace_name || "";

    return NextResponse.json({ displayName, workspaceName, email: user.email });
  } catch (error) {
    console.error("Unable to load profile", error);
    return NextResponse.json({ error: "Impossible de charger le profil." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }

    const parsed = validateProfileUpdate(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const update: { display_name?: string; workspace_name?: string } = {};
    if (parsed.value.displayName !== undefined) update.display_name = parsed.value.displayName;
    if (parsed.value.workspaceName !== undefined) update.workspace_name = parsed.value.workspaceName;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select("display_name, workspace_name")
      .single();

    if (error) throw error;
    return NextResponse.json({
      displayName: data.display_name,
      workspaceName: data.workspace_name,
      email: user.email,
    });
  } catch (error) {
    console.error("Unable to update profile", error);
    return NextResponse.json({ error: "Impossible de modifier le profil." }, { status: 500 });
  }
}
