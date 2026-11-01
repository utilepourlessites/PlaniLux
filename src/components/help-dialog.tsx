"use client";

import { BookOpen, CalendarDays, Check, Command, Download, Sparkles, X } from "lucide-react";

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="modal-scrim" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="help-dialog-title">
      <div className="settings-modal help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title-wrap">
            <span className="settings-icon-mark"><BookOpen size={18} /></span>
            <div>
              <h2 id="help-dialog-title">Centre d'aide & Raccourcis</h2>
              <p>Retrouve les astuces et raccourcis pour profiter pleinement de PlaniLux.</p>
            </div>
          </div>
          <button className="icon-button modal-close" onClick={onClose} aria-label="Fermer"><X size={17} /></button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <div className="setting-card">
              <strong style={{ display: "block", marginBottom: 10 }}>⌨️ Raccourcis clavier pratiques</strong>
              <div className="help-shortcut-grid">
                <div className="help-shortcut-row">
                  <span>Rechercher un tableau</span>
                  <kbd><Command size={11} /> + K</kbd>
                </div>
                <div className="help-shortcut-row">
                  <span>Valider ou fermer un créneau</span>
                  <kbd>Entrée</kbd>
                </div>
                <div className="help-shortcut-row">
                  <span>Fermer une fenêtre modale</span>
                  <kbd>Échap</kbd>
                </div>
              </div>
            </div>

            <div className="setting-card">
              <strong style={{ display: "block", marginBottom: 8 }}>🖨️ Exports & Impressions</strong>
              <p style={{ margin: "0 0 8px", fontSize: "11px", color: "var(--muted)", lineHeight: 1.5 }}>
                Rends-toi dans un planning et clique sur <strong>« Exporter »</strong> pour accéder au Studio :
              </p>
              <ul className="help-list">
                <li><strong>PDF haute qualité :</strong> Parfait pour imprimer en A4 ou US Letter, en orientation portrait ou paysage.</li>
                <li><strong>Document Word (.docx) :</strong> Pour retravailler tes cours et ajouter des annotations.</li>
                <li><strong>Image PNG & Fond téléphone :</strong> Emporte ton emploi du temps en écran de verrouillage 9:16 !</li>
              </ul>
            </div>

            <div className="setting-card">
              <strong style={{ display: "block", marginBottom: 8 }}>🔒 Confidentialité & Sauvegarde</strong>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)", lineHeight: 1.5 }}>
                PlaniLux est conçu selon le principe <strong>« Local First »</strong>. Vos tableaux sont stockés en toute sécurité directement dans votre navigateur et restent accessibles même sans connexion Internet.
              </p>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <span className="settings-autosave-note">
            <Sparkles size={13} /> Besoin d'une pause ? Planifie-la comme un vrai rendez-vous !
          </span>
          <button className="button-primary" onClick={onClose}>
            <Check size={15} /> J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
}
