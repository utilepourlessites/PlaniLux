export const dynamic = "force-dynamic";

// Sonde de santé volontairement sans accès à la base (pas de fuite d'information, pas de coût).
export async function GET() {
  return Response.json({ ok: true });
}
