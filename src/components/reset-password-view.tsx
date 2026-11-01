"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import "@/app/landing.css";

export function ResetPasswordView() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) { setFeedback("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (password !== confirm) { setFeedback("Les deux mots de passe ne correspondent pas."); return; }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setFeedback("Le service d’authentification n’est pas configuré."); return; }
    setBusy(true);
    setFeedback("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setFeedback(error.code === "weak_password" ? "Mot de passe trop faible : choisissez-en un plus long et plus varié." : "Impossible de changer le mot de passe. Demandez un nouveau lien.");
      return;
    }
    router.push("/app");
    router.refresh();
  };

  return (
    <div className="auth-page-root">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Nouveau mot de passe</h1>
          <p>Choisissez un nouveau mot de passe pour votre compte PlaniLux.</p>
        </div>
        {feedback && (
          <div role="alert" style={{ color: "#c45b56", fontSize: 12, marginBottom: 12, padding: "8px 10px", background: "rgba(196,91,86,0.06)", borderRadius: 7 }}>
            {feedback}
          </div>
        )}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="reset-password">Nouveau mot de passe</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input id="reset-password" type="password" className="auth-input" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="reset-confirm">Confirmer le mot de passe</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input id="reset-confirm" type="password" className="auth-input" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn-auth-submit" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer le mot de passe"}
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
