import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UUID_REGEX } from "@/lib/board-validation";
import { generateCalendarToken } from "../calendar/route";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que le tableau appartient bien à l'utilisateur
    const { data, error } = await supabase
      .from("planner_boards")
      .select("id, title")
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Tableau introuvable" }, { status: 404 });
    }

    const token = generateCalendarToken(id);
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "planilux.vercel.app";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const httpUrl = `${proto}://${host}/api/boards/${id}/calendar?token=${token}`;
    const webcalUrl = httpUrl.replace(/^https?:\/\//i, "webcal://");

    return NextResponse.json({ token, httpUrl, webcalUrl });
  } catch (err) {
    console.error("Erreur token calendrier:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
