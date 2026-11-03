"use client";

import { useState } from "react";
import Image from "next/image";
import {
  BookOpen, CalendarDays, ChevronDown, CircleHelp, FolderOpen, Home,
  LayoutGrid, LogOut, Plus, Settings2, Sparkles, Star, Trash2, X,
} from "lucide-react";
import type { PlannerBoard } from "@/lib/planner-types";

export type PlannerView = "overview" | "boards" | "starred" | "trash" | "university" | "personal" | "editor" | "studio";

type Props = {
  view: PlannerView;
  boards: PlannerBoard[];
  activeId: string | null;
  open: boolean;
  onNavigate: (view: PlannerView) => void;
  onCreate: () => void;
  onOpenBoard: (id: string) => void;
  onClose: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  onLogout?: () => void;
  userName?: string;
  workspaceName?: string;
};

export function PlannerSidebar({
  view,
  boards,
  activeId,
  open,
  onNavigate,
  onCreate,
  onOpenBoard,
  onClose,
  onOpenSettings,
  onOpenHelp,
  onLogout,
  userName = "Mon compte",
  workspaceName = "Mon espace",
}: Props) {
  const [showTip, setShowTip] = useState(true);
  const activeBoards = boards.filter((board) => !board.isDeleted);
  const trashCount = boards.filter((board) => board.isDeleted).length;
  const starredCount = activeBoards.filter((board) => board.favorite).length;
  const userInitials = userName.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "MC";

  const handleNav = (target: PlannerView) => {
    onNavigate(target);
    onClose();
  };

  const handleOpenSettings = () => {
    if (onOpenSettings) onOpenSettings();
    onClose();
  };

  const handleOpenHelp = () => {
    if (onOpenHelp) onOpenHelp();
    onClose();
  };

  const handleCreate = () => {
    onCreate();
    onClose();
  };

  return (
    <>
      {/* Fond sombre transparent pour fermeture au clic sur mobile */}
      <div
        className={`mobile-scrim ${open ? "is-visible" : ""}`}
        aria-label="Fermer le menu"
        onClick={onClose}
      />

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`} aria-label="Menu principal">
        <div className="brand-row flex items-center justify-between">
          <button onClick={() => handleNav("overview")} className="brand-row-button" title="Retour à la vue d’ensemble">
            <div className="brand-mark">
              <Image src="/icon-192.png" alt="Logo PlaniLux" width={34} height={34} unoptimized style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <span className="brand-name">Plani<span>Lux</span></span>
          </button>
          <button className="icon-button sidebar-close" aria-label="Fermer le menu" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <button className="workspace-switcher" onClick={handleOpenSettings} aria-label="Paramètres de l’espace">
          <span className="workspace-avatar">{workspaceName.charAt(0).toUpperCase()}</span>
          <span className="workspace-copy"><strong>{workspaceName}</strong></span>
          <ChevronDown size={15} className="workspace-chevron" />
        </button>

        <button className="primary-create" onClick={handleCreate}>
          <span className="create-plus"><Plus size={17} /></span>
          <span>Nouveau tableau</span>
        </button>

        <div className="nav-section-label">ESPACE DE TRAVAIL</div>
        <nav className="side-nav" aria-label="Navigation principale">
          <button className={`nav-item ${view === "overview" ? "nav-active" : ""}`} onClick={() => handleNav("overview")}>
            <Home size={17} /><span>Vue d’ensemble</span>
          </button>
          <button className={`nav-item ${view === "boards" || view === "editor" ? "nav-active" : ""}`} onClick={() => handleNav("boards")}>
            <LayoutGrid size={17} /><span>Mes tableaux</span><span className="nav-counter">{activeBoards.length}</span>
          </button>
          <button className={`nav-item ${view === "starred" ? "nav-active" : ""}`} onClick={() => handleNav("starred")}>
            <Star size={17} /><span>Favoris</span><span className="nav-counter">{starredCount}</span>
          </button>
          <button className={`nav-item ${view === "trash" ? "nav-active" : ""}`} onClick={() => handleNav("trash")}>
            <Trash2 size={17} /><span>Corbeille</span>{trashCount > 0 && <span className="nav-counter">{trashCount}</span>}
          </button>
        </nav>

        <div className="folder-heading">
          <div className="nav-section-label">MES DOSSIERS</div>
        </div>
        <nav className="side-nav folder-nav" aria-label="Dossiers">
          <button className={`nav-item ${view === "university" ? "nav-active" : ""}`} onClick={() => handleNav("university")}>
            <span className="folder-dot folder-dot-violet" /><span>Université</span><span className="folder-count">{activeBoards.filter((board) => board.kind === "school").length}</span>
          </button>
          <button className={`nav-item ${view === "personal" ? "nav-active" : ""}`} onClick={() => handleNav("personal")}>
            <span className="folder-dot folder-dot-green" /><span>Personnel</span><span className="folder-count">{activeBoards.filter((board) => board.kind !== "school").length}</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          {showTip && (
            <div className="sidebar-tip">
              <div className="tip-icon"><CalendarDays size={16} /></div>
              <div><strong>Une semaine sereine</strong><p>Un petit pas à la fois. Tu es sur la bonne voie.</p></div>
              <button className="tip-dismiss" aria-label="Masquer le conseil" onClick={() => setShowTip(false)}><X size={13} /></button>
            </div>
          )}
          <button className="nav-item muted-nav" onClick={handleOpenHelp}>
            <BookOpen size={16} /><span>Centre d’aide</span><CircleHelp size={14} className="help-mark" />
          </button>
          <button className="nav-item muted-nav" onClick={handleOpenSettings}>
            <Settings2 size={16} /><span>Paramètres</span>
          </button>
          <div className="sidebar-profile">
            <button
              type="button"
              className="sidebar-profile-info"
              onClick={handleOpenSettings}
              style={{ cursor: "pointer", flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", padding: 0, textAlign: "left" }}
              title="Ouvrir mon profil & paramètres"
            >
              <div className="profile-avatar">{userInitials}</div>
              <div className="profile-copy"><strong>{userName}</strong><span>Espace personnel</span></div>
            </button>
            <button
              className="tiny-icon-button sidebar-logout-btn"
              aria-label="Se déconnecter"
              title="Déconnexion (fermer la session)"
              onClick={(e) => {
                e.stopPropagation();
                if (onLogout) onLogout();
                else window.location.href = "/login";
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
