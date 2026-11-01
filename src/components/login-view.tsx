"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Lock, Mail, Shield, Sparkles, UserRound,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import "@/app/landing.css";

export function LoginView() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "signup") {
        return "signup";
      }
    }
    return "login";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setFeedback("Veuillez remplir votre email et votre mot de passe.");
      return;
    }
    setBusy(true);
    setFeedback("");

    const supabase = getSupabaseClient();

    try {
      if (supabase) {
        if (mode === "signup") {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password.trim(),
            options: {
              data: {
                full_name: name.trim() || undefined,
              },
            },
          });
          if (error) {
            setFeedback(error.message);
            setBusy(false);
            return;
          }
          if (data.user) {
            const displayName = name.trim() || data.user.user_metadata?.full_name || email.split("@")[0];
            try { window.localStorage.setItem("planilux-user-name", displayName); } catch {}
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });
          if (error) {
            setFeedback(error.message);
            setBusy(false);
            return;
          }
          if (data.user) {
            const displayName = data.user.user_metadata?.full_name || email.split("@")[0];
            const formatted = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            try { window.localStorage.setItem("planilux-user-name", formatted); } catch {}
          }
        }
      } else {
        // Mode hors-ligne / fallback local
        if (mode === "signup" && name.trim()) {
          try { window.localStorage.setItem("planilux-user-name", name.trim()); } catch {}
        } else if (!window.localStorage.getItem("planilux-user-name")) {
          try {
            const userPrefix = email.split("@")[0] || "Camille";
            const formatted = userPrefix.charAt(0).toUpperCase() + userPrefix.slice(1);
            window.localStorage.setItem("planilux-user-name", formatted);
          } catch {}
        }
      }

      router.push("/app");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur inattendue est survenue.";
      setFeedback(message);
    } finally {
      setBusy(false);
    }
  };

  const handleGuestAccess = () => {
    router.push("/app");
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
          <h1>{mode === "login" ? "Connexion" : "Créer un compte"}</h1>
          <p>
            {mode === "login"
              ? "Retrouve tes plannings et ton espace de travail."
              : "Rejoins PlaniLux pour composer tes semaines en toute sérénité."}
          </p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={mode === "login"}
            className={`auth-tab-btn ${mode === "login" ? "is-active" : ""}`}
            onClick={() => { setMode("login"); setFeedback(""); }}
          >
            Se connecter
          </button>
          <button
            role="tab"
            aria-selected={mode === "signup"}
            className={`auth-tab-btn ${mode === "signup" ? "is-active" : ""}`}
            onClick={() => { setMode("signup"); setFeedback(""); }}
          >
            Créer un compte
          </button>
        </div>

        {feedback && (
          <div style={{ color: "#c45b56", fontSize: 11, marginBottom: 12, padding: "8px 10px", background: "rgba(196,91,86,0.06)", borderRadius: 7 }}>
            {feedback}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="auth-name">Nom complet ou prénom</label>
              <div className="auth-input-wrap">
                <UserRound size={16} className="auth-input-icon" />
                <input
                  id="auth-name"
                  type="text"
                  className="auth-input"
                  placeholder="Ex : Camille Moreau"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={mode === "signup"}
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Adresse email</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="auth-email"
                type="email"
                className="auth-input"
                placeholder="nom@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Mot de passe</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="auth-password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-options-row">
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Se souvenir de moi</span>
            </label>
            {mode === "login" && (
              <a href="#reset" onClick={(e) => { e.preventDefault(); alert("Un lien de réinitialisation vous sera envoyé sur votre adresse email."); }} className="auth-link-quiet">
                Mot de passe oublié ?
              </a>
            )}
          </div>

          <button type="submit" className="btn-auth-submit" disabled={busy}>
            {busy ? "Accès à l’espace…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
            <ArrowRight size={15} />
          </button>
        </form>

        <div className="auth-divider">
          <span>ou</span>
        </div>

        <button className="btn-guest-access" onClick={handleGuestAccess} type="button">
          <Shield size={15} color="#8c7dc8" />
          Continuer en mode invité (100% hors-ligne)
        </button>

        <div className="auth-footer-note">
          <span>© 2026 PlaniLux · Vos journées bien ordonnées.</span>
        </div>
      </div>
    </div>
  );
}
