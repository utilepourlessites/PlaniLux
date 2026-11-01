import { LoginView } from "@/components/login-view";

export const dynamic = "force-dynamic";

type LoginPageProps = { searchParams: Promise<{ mode?: string; error?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { mode, error } = await searchParams;
  return <LoginView initialMode={mode === "signup" ? "signup" : "login"} initialError={error} />;
}
