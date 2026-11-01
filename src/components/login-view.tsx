"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, UserRound } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import "@/app/landing.css";

type Mode = "login" | "signup" | "forgot";
type Notice = { kind: "error" | "info"; text: string };

const URL_ERRORS: Record<string, string> = {
  auth: "Le lien de connexion est invalide ou a expiré. Veuillez réessayer.",
  reset: "Le lien de réinitialisation est invalide ou a expiré. Demandez-en un nouveau.",
};

/** Messages génériques : on ne révèle jamais si une adresse e-mail possède déjà un compte. */
function friendlyAuthError(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials": return "Adresse e-mail ou mot de passe incorrect.";
    case "email_not_confirmed": return "Confirmez d’abord votre adresse e-mail grâce au lien reçu par message.";
    case "weak_password": return "Mot de passe trop faible : 8 caractères minimum, de préférence variés.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "Trop de tentatives. Réessayez dans quelques minutes.";
    default: return "Une erreur est survenue. Veuillez réessayer.";
  }
}

export function LoginView({ initialMode = "login", initialError }: { initialMode?: "login" | "signup"; initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(
    initialError && URL_ERRORS[initialError] ? { kind: "error", text: URL_ERRORS[initialError] } : null,
  );

  const switchMode = (next: Mode) => { setMode(next); setNotice(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || (mode !== "forgot" && !password)) {
      setNotice({ kind: "error", text: "Veuillez remplir tous les champs." });
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setNotice({ kind: "error", text: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setNotice({ kind: "error", text: "Le service d’authentification n’est pas configuré." });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const origin = window.location.origin;
      if (mode === "forgot") {
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${origin}/auth/callback?next=/auth/reset`,
        });
        setNotice({ kind: "info", text: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé." });
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: name.trim() || undefined },
            emailRedirectTo: `${origin}/auth/callback`,
          },
        });
        if (error) { setNotice({ kind: "error", text: friendlyAuthError(error.code) }); return; }
        if (!data.session) {
          // Confirmation par e-mail requise : pas de session tant que le lien n’est pas ouvert.
          setNotice({ kind: "info", text: "Compte créé. Vérifiez votre boîte mail et cliquez sur le lien de confirmation pour vous connecter." });
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) { setNotice({ kind: "error", text: friendlyAuthError(error.code) }); return; }
      }

      router.push("/app");
      router.refresh();
    } catch {
      setNotice({ kind: "error", text: "Une erreur inattendue est survenue. Veuillez réessayer." });
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, { h: string; p: string; cta: string }> = {
    login: { h: "Connexion", p: "Retrouvez vos plannings et votre espace de travail.", cta: "Se connecter" },
    signup: { h: "Créer un compte", p: "Rejoignez PlaniLux pour composer vos semaines en toute sérénité.", cta: "Créer mon compte" },
    forgot: { h: "Mot de passe oublié", p: "Saisissez votre adresse e-mail : nous vous enverrons un lien pour en choisir un nouveau.", cta: "Envoyer le lien" },
  };

  return (
    <div className="auth-page-root">
      <div className="auth-card">
        <div className="auth-header">
          <div className="landing-logo" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <div className="landing-logo-text" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <span className="landing-logo-title" style={{ fontSize: 32, letterSpacing: "-0.9px", lineHeight: 1.15 }}>Plani<span>Lux</span></span>
              <span className="landing-logo-sub" style={{ fontSize: 14, letterSpacing: "0.5px", marginTop: 4 }}>Studio de planning</span>
            </div>
          </div>
          <h1>{titles[mode].h}</h1>
          <p>{titles[mode].p}</p>
        </div>

        {mode !== "forgot" && (
          <div className="auth-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "login"} className={`auth-tab-btn ${mode === "login" ? "is-active" : ""}`} onClick={() => switchMode("login")}>
              Se connecter
            </button>
            <button type="button" role="tab" aria-selected={mode === "signup"} className={`auth-tab-btn ${mode === "signup" ? "is-active" : ""}`} onClick={() => switchMode("signup")}>
              Créer un compte
            </button>
          </div>
        )}

        {notice && (
          <div
            role={notice.kind === "error" ? "alert" : "status"}
            style={{
              color: notice.kind === "error" ? "#c45b56" : "#3f7d5c",
              fontSize: 12,
              marginBottom: 12,
              padding: "8px 10px",
              background: notice.kind === "error" ? "rgba(196,91,86,0.06)" : "rgba(63,125,92,0.08)",
              borderRadius: 7,
            }}
          >
            {notice.text}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="auth-name">Nom complet ou prénom</label>
              <div className="auth-input-wrap">
                <UserRound size={16} className="auth-input-icon" />
                <input id="auth-name" type="text" className="auth-input" placeholder="Votre prénom et nom" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Adresse e-mail</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input id="auth-email" type="email" className="auth-input" placeholder="nom@exemple.fr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          {mode !== "forgot" && (
            <div className="auth-field">
              <label htmlFor="auth-password">Mot de passe</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input id="auth-password" type="password" className="auth-input" placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="auth-options-row">
            {mode === "login" && (
              <button type="button" onClick={() => switchMode("forgot")} className="auth-link-quiet" style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>
                Mot de passe oublié ?
              </button>
            )}
            {mode === "forgot" && (
              <button type="button" onClick={() => switchMode("login")} className="auth-link-quiet" style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>
                Retour à la connexion
              </button>
            )}
          </div>

          <button type="submit" className="btn-auth-submit" disabled={busy}>
            {busy ? "Un instant…" : titles[mode].cta}
            <ArrowRight size={15} />
          </button>
        </form>

        <div className="auth-footer-note">
          <span>© 2026 PlaniLux · Vos journées bien ordonnées.</span>
        </div>
      </div>
    </div>
  );
}
