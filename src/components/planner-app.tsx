"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  Bell, CalendarDays, Check, ChevronDown, ChevronRight, Command, LogOut,
  Menu, Minus, Moon, Plus, Search, Sparkles, Sun, SunMedium, X,
} from "lucide-react";
import { PlannerSidebar, type PlannerView } from "@/components/planner-sidebar";
import { Overview } from "@/components/overview";
import { BoardLibrary } from "@/components/board-library";
import { ScheduleEditor } from "@/components/schedule-editor";
import { TemplateDialog } from "@/components/template-dialog";
import { ExportStudio } from "@/components/export-studio";
import { SettingsDialog } from "@/components/settings-dialog";
import { HelpDialog } from "@/components/help-dialog";
import { makeTemplate } from "@/lib/templates";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { BOARD_KIND_LABELS } from "@/lib/planner-types";
import type { BoardKind, PlannerBoard, ScheduleEvent } from "@/lib/planner-types";

const THEME_KEY = "planilux-theme";
const FONT_SCALE_KEY = "planilux-font-scale";
const BRIGHTNESS_KEY = "planilux-brightness";
const DEFAULT_USER_NAME = "Mon compte";

const emptySubscribe = () => () => {};

export function PlannerApp() {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [boards, setBoards] = useState<PlannerBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [view, setView] = useState<PlannerView>("overview");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved !== null) {
        return saved === "dark";
      }
    }
    return true;
  });
  const [fontScale, setFontScale] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = Number(window.localStorage.getItem(FONT_SCALE_KEY));
      if (saved && !isNaN(saved)) return saved;
    }
    return 100;
  });
  const [brightness, setBrightness] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = Number(window.localStorage.getItem(BRIGHTNESS_KEY));
      if (saved && !isNaN(saved) && saved >= 50 && saved <= 150) return saved;
    }
    return 100;
  });
  const [brightnessOpen, setBrightnessOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState<string>("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [toast, setToast] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const brightnessRef = useRef<HTMLDivElement>(null);

  const activeBoard = boards.find((board) => board.id === activeId) ?? null;
  const toastMessage = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  const applyFontScale = useCallback((scale: number) => {
    setFontScale(scale);
    try { window.localStorage.setItem(FONT_SCALE_KEY, String(scale)); } catch {}
    document.documentElement.dataset.fontScale = String(scale);
    document.documentElement.style.setProperty("--font-scale", String(scale / 100));
    document.body.style.zoom = String(scale / 100);
  }, []);

  const applyBrightness = useCallback((val: number) => {
    const clamped = Math.max(50, Math.min(150, val));
    setBrightness(clamped);
    try {
      window.localStorage.setItem(BRIGHTNESS_KEY, String(clamped));
    } catch {}
    document.documentElement.style.setProperty("--app-brightness", `${clamped}%`);
  }, []);

  const handleLogout = useCallback(async () => {
    toastMessage("Déconnexion en cours…");
    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) await supabase.auth.signOut();
    } catch {}
    try {
      window.localStorage.clear();
    } catch {}
    window.location.href = "/login";
  }, [toastMessage]);

  const handleClearData = useCallback(async () => {
    try {
      const res = await fetch("/api/boards", { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur de suppression");
      setBoards([]);
      setActiveId(null);
      setView("overview");
      toastMessage("Tous les tableaux ont été supprimés");
    } catch {
      toastMessage("Échec de la suppression des tableaux");
    }
  }, [toastMessage]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur de suppression de compte");
      handleLogout();
    } catch {
      toastMessage("Échec de la suppression du compte");
    }
  }, [handleLogout, toastMessage]);

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_KEY);
    const isDark = saved !== null ? saved === "dark" : true;
    document.documentElement.dataset.theme = isDark ? "dark" : "light";

    const savedFontScale = Number(window.localStorage.getItem(FONT_SCALE_KEY));
    const fontScaleToApply = savedFontScale && !isNaN(savedFontScale) ? savedFontScale : 100;
    document.documentElement.dataset.fontScale = String(fontScaleToApply);
    document.documentElement.style.setProperty("--font-scale", String(fontScaleToApply / 100));
    document.body.style.zoom = String(fontScaleToApply / 100);

    const savedBrightness = Number(window.localStorage.getItem(BRIGHTNESS_KEY));
    if (savedBrightness && !isNaN(savedBrightness) && savedBrightness >= 50 && savedBrightness <= 150) {
      document.documentElement.style.setProperty("--app-brightness", `${savedBrightness}%`);
    } else {
      document.documentElement.style.setProperty("--app-brightness", "100%");
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    let cancelled = false;

    // Charger le profil utilisateur
    fetch("/api/profile", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) { window.location.href = "/login"; return; }
        if (!res.ok) return;
        const profile = await res.json();
        if (cancelled) return;
        if (profile.displayName) setUserName(profile.displayName);
        if (profile.workspaceName) setWorkspaceName(profile.workspaceName);
      })
      .catch(() => undefined);

    // Charger les tableaux depuis l'API
    fetch("/api/boards", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) { window.location.href = "/login"; return; }
        if (!response.ok) throw new Error("Erreur de chargement");
        const remote = await response.json() as PlannerBoard[];
        if (cancelled || !Array.isArray(remote)) return;
        setBoards(remote);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const clickOutsideNotif = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutsideNotif);
    return () => document.removeEventListener("mousedown", clickOutsideNotif);
  }, [notifOpen]);

  useEffect(() => {
    if (!brightnessOpen) return;
    const clickOutsideBrightness = (event: MouseEvent) => {
      if (brightnessRef.current && !brightnessRef.current.contains(event.target as Node)) {
        setBrightnessOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutsideBrightness);
    return () => document.removeEventListener("mousedown", clickOutsideBrightness);
  }, [brightnessOpen]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const commitBoard = async (board: PlannerBoard, isNew = false) => {
    const exists = boards.some((item) => item.id === board.id);
    const next = exists ? boards.map((item) => item.id === board.id ? board : item) : [board, ...boards];
    setBoards(next);
    setSyncStatus("saving");

    const method = isNew || !exists ? "POST" : "PATCH";
    try {
      const response = await fetch(method === "POST" ? "/api/boards" : `/api/boards/${board.id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(board),
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        setSyncStatus("error");
        toastMessage("Échec de la synchronisation sur le serveur");
        return;
      }

      const saved = await response.json() as PlannerBoard;
      if (saved.id) {
        setBoards((prev) => prev.map((item) => item.id === saved.id ? { ...item, ...saved } : item));
      }
      setSyncStatus("saved");
    } catch {
      setSyncStatus("error");
      toastMessage("Erreur de connexion au serveur");
    }
  };

  const createBoard = (kind: BoardKind, title?: string) => {
    const board = makeTemplate(kind, title);
    commitBoard(board, true);
    setActiveId(board.id);
    setView("editor");
    setTemplateOpen(false);
    toastMessage(`${BOARD_KIND_LABELS[kind]} créé`);
  };

  const openBoard = (id: string) => {
    setActiveId(id);
    setView("editor");
  };

  const updateEvent = (updated: ScheduleEvent) => {
    if (!activeBoard) return;
    const found = activeBoard.events.some((event) => event.id === updated.id);
    const events = found
      ? activeBoard.events.map((event) => event.id === updated.id ? updated : event)
      : [...activeBoard.events, updated];
    commitBoard({ ...activeBoard, events, updatedAt: new Date().toISOString() });
  };

  const deleteEvent = (id: string) => {
    if (!activeBoard) return;
    commitBoard({ ...activeBoard, events: activeBoard.events.filter((event) => event.id !== id), updatedAt: new Date().toISOString() });
    toastMessage("Créneau supprimé");
  };

  const updateBoard = (board: PlannerBoard) => commitBoard({ ...board, updatedAt: new Date().toISOString() });

  const archiveBoard = (board: PlannerBoard) => {
    commitBoard({ ...board, isDeleted: true, updatedAt: new Date().toISOString() });
    if (activeId === board.id) { setActiveId(null); setView("boards"); }
    toastMessage("Déplacé dans la corbeille");
  };

  const restoreBoard = (board: PlannerBoard) => {
    commitBoard({ ...board, isDeleted: false, updatedAt: new Date().toISOString() });
    toastMessage("Tableau restauré");
  };

  const duplicateBoard = (board: PlannerBoard) => {
    const now = new Date().toISOString();
    const duplicate: PlannerBoard = {
      ...board,
      id: crypto.randomUUID(),
      title: `${board.title} (copie)`,
      favorite: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      events: board.events.map((event) => ({ ...event, id: crypto.randomUUID() })),
    };
    commitBoard(duplicate, true);
    toastMessage("Une copie a été créée");
  };

  const removePermanently = async (board: PlannerBoard) => {
    setBoards((prev) => prev.filter((item) => item.id !== board.id));
    try {
      await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
    } catch {}
    toastMessage("Tableau supprimé définitivement");
  };

  const toggleFavorite = (board: PlannerBoard) => updateBoard({ ...board, favorite: !board.favorite });
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  };

  const saveUserName = async (name: string) => {
    setUserName(name);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
    } catch {}
  };

  const saveWorkspaceName = async (name: string) => {
    setWorkspaceName(name);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceName: name }),
      });
    } catch {}
  };

  const userInitials = (userName || DEFAULT_USER_NAME).trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "MC";

  const filteredBoards = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr");
    return boards.filter((board) => {
      if (view === "trash") return board.isDeleted && (!term || board.title.toLocaleLowerCase("fr").includes(term));
      if (board.isDeleted) return false;
      if (view === "starred" && !board.favorite) return false;
      if (view === "university" && board.kind !== "school") return false;
      if (view === "personal" && board.kind === "school") return false;
      return !term || board.title.toLocaleLowerCase("fr").includes(term) || BOARD_KIND_LABELS[board.kind].toLocaleLowerCase("fr").includes(term);
    });
  }, [boards, search, view]);

  const pageTitle = view === "editor" ? activeBoard?.title ?? "Mon tableau" : view === "studio" ? "Studio d’export" : view === "overview" ? "Vue d’ensemble" : view === "starred" ? "Mes favoris" : view === "trash" ? "Corbeille" : view === "university" ? "Université" : view === "personal" ? "Personnel" : "Mes tableaux";
  const openTemplateDialog = () => setTemplateOpen(true);

  return (
    <div className={`app-frame ${dark ? "theme-dark" : ""}`}>
      <PlannerSidebar
        view={view}
        boards={boards}
        activeId={activeId}
        onNavigate={(nextView) => { setView(nextView); setActiveId(null); }}
        onOpenBoard={openBoard}
        onCreate={openTemplateDialog}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onLogout={handleLogout}
        userName={userName || DEFAULT_USER_NAME}
        workspaceName={workspaceName || "Mon espace"}
      />

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">
              <Menu size={19} />
            </button>
            <div className="breadcrumbs">
              <span>{workspaceName || "Mon espace"}</span>
              <ChevronRight size={14} />
              <strong>{pageTitle}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un tableau, un cours…"
                aria-label="Recherche rapide"
              />
              <kbd><Command size={11} />K</kbd>
            </label>

            <span className="topbar-divider" />

            <div className="brightness-wrapper" ref={brightnessRef}>
              <button
                className={`icon-button brightness-toggle ${brightness !== 100 ? "has-filter" : ""}`}
                onClick={() => setBrightnessOpen(!brightnessOpen)}
                aria-label="Régler la luminosité"
                title={`Luminosité : ${brightness}%`}
              >
                <SunMedium size={18} />
                {brightness !== 100 && <span className="brightness-dot" />}
              </button>
              {brightnessOpen && (
                <div className="brightness-popover" role="dialog" aria-label="Contrôle de luminosité">
                  <div className="brightness-popover-header">
                    <strong>Luminosité</strong>
                    <span>{brightness}%</span>
                  </div>
                  <div className="brightness-slider-row">
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="5"
                      value={brightness}
                      onChange={(e) => applyBrightness(Number(e.target.value))}
                      aria-label="Curseur de luminosité"
                    />
                  </div>
                  <div className="brightness-presets-bar">
                    {[75, 90, 100, 115, 130].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`brightness-chip ${brightness === val ? "is-active" : ""}`}
                        onClick={() => applyBrightness(val)}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={dark ? "Passer au thème clair" : "Passer au thème sombre"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>

            <div className="notif-wrapper" ref={notifRef}>
              <button
                className="icon-button notification-button"
                onClick={() => { setNotifOpen(!notifOpen); setHasUnreadNotifs(false); }}
                aria-label="Notifications"
                aria-expanded={notifOpen}
              >
                <Bell size={18} />
                {hasUnreadNotifs && <i />}
              </button>
              {notifOpen && (
                <div className="notif-popover" role="dialog" aria-label="Notifications">
                  <div className="notif-popover-header">
                    <strong>Notifications</strong>
                  </div>
                  <div className="notif-list">
                    <div className="notif-item" style={{ textAlign: "center", padding: "16px", color: "var(--muted)" }}>
                      <span>Aucune notification pour le moment.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <span className="topbar-divider" />

            <button className="topbar-user topbar-user-btn" onClick={() => setSettingsOpen(true)} title="Paramètres de profil" aria-label="Paramètres de profil">
              <span>{userInitials}</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>

        {!isClient || loading ? (
          <div className="app-loading">
            <div style={{ width: 64, height: 64, borderRadius: 18, overflow: "hidden", boxShadow: "0 8px 24px rgba(25, 20, 50, 0.18)" }}>
              <Image src="/logo.png" alt="PlaniLux" width={64} height={64} unoptimized style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <p>Chargement de vos plannings…</p>
          </div>
        ) : (
          <div className="page-content">
            {view === "overview" && (
              <Overview
                boards={boards.filter((board) => !board.isDeleted)}
                onCreate={openTemplateDialog}
                onOpen={openBoard}
                onNavigate={(nextView) => setView(nextView)}
                userName={userName}
              />
            )}

            {(view === "boards" || view === "starred" || view === "university" || view === "personal") && (
              <BoardLibrary
                view={view}
                boards={filteredBoards}
                query={search}
                onCreate={openTemplateDialog}
                onOpen={openBoard}
                onFavorite={toggleFavorite}
                onArchive={archiveBoard}
                onRestore={restoreBoard}
                onDelete={removePermanently}
                onDuplicate={duplicateBoard}
                onClearSearch={() => setSearch("")}
                userName={userName}
              />
            )}

            {view === "trash" && (
              <BoardLibrary
                view="trash"
                boards={filteredBoards}
                query={search}
                onCreate={openTemplateDialog}
                onOpen={openBoard}
                onFavorite={toggleFavorite}
                onArchive={restoreBoard}
                onRestore={restoreBoard}
                onDelete={removePermanently}
                onDuplicate={duplicateBoard}
                onClearSearch={() => setSearch("")}
                userName={userName}
              />
            )}

            {view === "editor" && activeBoard && (
              <ScheduleEditor
                board={activeBoard}
                onBoardChange={updateBoard}
                onBack={() => { setActiveId(null); setView("boards"); }}
                onOpenStudio={() => setView("studio")}
                onEventSave={updateEvent}
                onEventDelete={deleteEvent}
                onToast={toastMessage}
                syncStatus={syncStatus}
              />
            )}

            {view === "studio" && activeBoard && (
              <ExportStudio
                board={activeBoard}
                onBack={() => setView("editor")}
                onToast={toastMessage}
              />
            )}
          </div>
        )}
      </main>

      {templateOpen && (
        <TemplateDialog
          onClose={() => setTemplateOpen(false)}
          onCreate={createBoard}
        />
      )}

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fontScale={fontScale}
        onChangeFontScale={applyFontScale}
        brightness={brightness}
        onChangeBrightness={applyBrightness}
        dark={dark}
        onToggleDark={toggleTheme}
        userName={userName}
        onChangeUserName={saveUserName}
        workspaceName={workspaceName}
        onChangeWorkspaceName={saveWorkspaceName}
        boards={boards}
        onImportBoards={(imported) => {
          for (const item of imported) commitBoard(item, true);
        }}
        onClearData={handleClearData}
        onDeleteAccount={handleDeleteAccount}
        onLogout={handleLogout}
        onToast={toastMessage}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Sparkles size={14} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
