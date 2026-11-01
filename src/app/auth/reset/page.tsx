import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResetPasswordView } from "@/components/reset-password-view";

export const dynamic = "force-dynamic";

export default async function ResetPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=reset");
  return <ResetPasswordView />;
}
