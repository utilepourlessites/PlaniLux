"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArchiveRestore, CalendarDays, Copy, Ellipsis, FileClock,
  Heart, LayoutGrid, Plus, Search, Star, Trash2, Undo2,
} from "lucide-react";
import type { PlannerView } from "@/components/planner-sidebar";
import { BOARD_KIND_LABELS, type PlannerBoard } from "@/lib/planner-types";

function PreviewPattern({ board }: { board: PlannerBoard }) {
  const colors = board.events.slice(0, 8);
  return (
    <div className={`library-preview preview-${board.kind}`} style={{ "--board-accent": board.color } as React.CSSProperties}>
      <div className="preview-toolbar"><span /><span /><span /><i /></div>
      <div className="preview-body">
        <div className="preview-rail"><span /><span /><span /><span /><span /></div>
        <div className="preview-grid">
          {Array.from({ length: board.kind === "monthly" ? 16 : 10 }, (_, index) => <i key={index} />)}
          {colors.map((event, index) => <b key={event.id} className={`preview-event preview-event-${index % 4}`} style={{ backgroundColor: event.color }} />)}
        </div>
      </div>
      <div className="preview-footer"><span>{BOARD_KIND_LABELS[board.kind]}</span><span>{board.events.length} créneaux</span></div>
    </div>
  );
}

function BoardCard({ board, trash, onOpen, onDuplicate, onFavorite, onArchive, onRestore, onDelete }: {
  board: PlannerBoard;
  trash: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onFavorite: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [menuOpen]);

  const handleOpen = () => {
    if (trash) {
      if (window.confirm("Ce tableau est actuellement dans la corbeille. Voulez-vous le restaurer pour l'ouvrir ?")) {
        onRestore();
        onOpen();
      }
      return;
    }
    onOpen();
  };

  const menuAction = (action: () => void) => { action(); setMenuOpen(false); };
  const updated = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(board.updatedAt));

  return (
    <article className={`board-card ${trash ? "board-card-trashed" : ""}`}>
      <button className="board-card-open" onClick={handleOpen} aria-label={`Ouvrir ${board.title}`}><PreviewPattern board={board} /></button>
      <div className="board-card-body">
        <div className="board-card-title-row">
          <button className="board-title-button" onClick={handleOpen}><strong>{board.title}</strong><span>{BOARD_KIND_LABELS[board.kind]}</span></button>
          {!trash && <button className={`favorite-toggle ${board.favorite ? "is-favorite" : ""}`} onClick={onFavorite} aria-label={board.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}><Star size={16} fill={board.favorite ? "currentColor" : "none"} /></button>}
          {trash && <span className="deleted-label"><Trash2 size={12} /> Corbeille</span>}
        </div>
        <div className="board-card-meta"><span><CalendarDays size={13} /> {board.events.length} créneau{board.events.length === 1 ? "" : "x"}</span><i />Mis à jour le {updated}</div>
        <div className="board-card-footer">
          <span className="board-color-indicator" style={{ background: board.color }} />
          <span className="board-owner"><span>CM</span> Camille</span>
          <div className="card-menu-wrap" ref={menuRef}>
            <button className="card-menu-trigger" aria-label="Options du tableau" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Ellipsis size={18} /></button>
            {menuOpen && <div className="card-menu" role="menu">
              {!trash ? <>
                <button role="menuitem" onClick={() => menuAction(onDuplicate)}><Copy size={14} /> Dupliquer</button>
                <button role="menuitem" className="menu-danger" onClick={() => menuAction(onArchive)}><Trash2 size={14} /> Déplacer à la corbeille</button>
              </> : <>
                <button role="menuitem" onClick={() => menuAction(onRestore)}><ArchiveRestore size={14} /> Restaurer le tableau</button>
                <button role="menuitem" className="menu-danger" onClick={() => menuAction(onDelete)}><Trash2 size={14} /> Supprimer définitivement</button>
              </>}
            </div>}
          </div>
        </div>
      </div>
    </article>
  );
}

const emptyCopy: Record<PlannerView, { icon: typeof LayoutGrid; title: string; text: string }> = {
  overview: { icon: LayoutGrid, title: "Un peu de calme avant le planning", text: "Crée ton premier tableau et construis ta semaine à ta façon." },
  boards: { icon: LayoutGrid, title: "Ton espace est encore tout neuf", text: "Choisis un modèle pour donner vie à ton premier planning." },
  starred: { icon: Heart, title: "Tes favoris t’attendent", text: "Épingle les tableaux que tu consultes souvent pour les retrouver ici." },
  trash: { icon: Trash2, title: "La corbeille est vide", text: "Les tableaux supprimés apparaîtront ici, prêts à être restaurés." },
  editor: { icon: LayoutGrid, title: "Aucun tableau sélectionné", text: "Choisis un planning pour commencer." },
  studio: { icon: LayoutGrid, title: "Aucun tableau sélectionné", text: "Choisis un planning pour commencer." },
  university: { icon: LayoutGrid, title: "Ton espace études est encore tout neuf", text: "Crée un emploi du temps pour organiser ton semestre." },
  personal: { icon: LayoutGrid, title: "Un peu de place pour tes projets", text: "Crée un planning personnel pour tes idées et tes routines." },
};

export function BoardLibrary({ view, boards, query, onCreate, onOpen, onDuplicate, onFavorite, onArchive, onRestore, onDelete, onClearSearch }: {
  view: PlannerView;
  boards: PlannerBoard[];
  query: string;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (board: PlannerBoard) => void;
  onFavorite: (board: PlannerBoard) => void;
  onArchive: (board: PlannerBoard) => void;
  onRestore: (board: PlannerBoard) => void;
  onDelete: (board: PlannerBoard) => void;
  onClearSearch: () => void;
}) {
  const isTrash = view === "trash";
  const label = view === "starred" ? "TES INDISPENSABLES" : isTrash ? "RANGÉS POUR PLUS TARD" : view === "university" ? "COURS & SEMESTRES" : view === "personal" ? "PROJETS & TEMPS POUR TOI" : "TOUT TON UNIVERS";
  const title = view === "starred" ? "Mes favoris" : isTrash ? "La corbeille" : view === "university" ? "Université" : view === "personal" ? "Personnel" : "Mes tableaux";
  const description = view === "starred" ? "Tes espaces préférés, toujours à portée de main." : isTrash ? "Tu peux restaurer un tableau à tout moment." : view === "university" ? "Tes cours, semestres et projets d’études." : view === "personal" ? "Tes projets, tes routines et tes moments à toi." : "Tous tes plannings, réunis au même endroit.";
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"recent" | "alpha" | "events" | "favorite">("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const clickOut = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [sortOpen]);

  const sortedBoards = useMemo(() => {
    return [...boards].sort((a, b) => {
      if (sortBy === "alpha") return a.title.localeCompare(b.title, "fr");
      if (sortBy === "events") return b.events.length - a.events.length;
      if (sortBy === "favorite") return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [boards, sortBy]);

  const empty = emptyCopy[view];
  const EmptyIcon = empty.icon;

  return (
    <div className="library-page">
      <div className="page-heading library-heading">
        <div><div className="eyebrow-date"><span className="eyebrow-sparkle">✳</span> {label}</div><h1>{title}</h1><p>{description}</p></div>
        {!isTrash && view !== "starred" && <button className="button-primary desktop-create" onClick={onCreate}><Plus size={17} /> Nouveau tableau</button>}
      </div>
      <div className="library-toolbar">
        <div className="library-count"><strong>{boards.length}</strong> tableau{boards.length === 1 ? "" : "x"}{query && <span> pour « {query} »</span>}</div>
        <div className="library-controls">
          {query && <button className="clear-filter" onClick={onClearSearch}><Search size={14} /> Effacer la recherche</button>}
          <div className="library-sort-wrap" ref={sortRef}>
            <button className="library-sort-button" onClick={() => setSortOpen(!sortOpen)} aria-label="Trier les tableaux" aria-expanded={sortOpen}>
              <FileClock size={14} />
              <span>{sortBy === "recent" ? "Récemment modifiés" : sortBy === "alpha" ? "Titre (A à Z)" : sortBy === "events" ? "Plus de créneaux" : "Favoris d’abord"}</span>
              <span className="sort-arrow">⌄</span>
            </button>
            {sortOpen && (
              <div className="library-sort-menu" role="menu">
                <button role="menuitem" className={sortBy === "recent" ? "is-selected" : ""} onClick={() => { setSortBy("recent"); setSortOpen(false); }}>Récemment modifiés</button>
                <button role="menuitem" className={sortBy === "alpha" ? "is-selected" : ""} onClick={() => { setSortBy("alpha"); setSortOpen(false); }}>Titre (A à Z)</button>
                <button role="menuitem" className={sortBy === "events" ? "is-selected" : ""} onClick={() => { setSortBy("events"); setSortOpen(false); }}>Nombre de créneaux</button>
                <button role="menuitem" className={sortBy === "favorite" ? "is-selected" : ""} onClick={() => { setSortBy("favorite"); setSortOpen(false); }}>Favoris d’abord</button>
              </div>
            )}
          </div>
          <div className="layout-toggle"><button className={layout === "grid" ? "layout-active" : ""} onClick={() => setLayout("grid")} aria-label="Affichage en grille"><LayoutGrid size={16} /></button><button className={layout === "list" ? "layout-active" : ""} onClick={() => setLayout("list")} aria-label="Affichage en liste"><span className="list-icon"><i /><i /><i /></span></button></div>
        </div>
      </div>

      {sortedBoards.length ? <div className={`board-library-grid ${layout === "list" ? "board-library-list" : ""}`}>
        {sortedBoards.map((board: PlannerBoard) => <BoardCard key={board.id} board={board} trash={isTrash} onOpen={() => onOpen(board.id)} onDuplicate={() => onDuplicate(board)} onFavorite={() => onFavorite(board)} onArchive={() => onArchive(board)} onRestore={() => onRestore(board)} onDelete={() => onDelete(board)} />)}
        {!isTrash && view !== "starred" && <button className="new-board-card" onClick={onCreate}><span className="new-board-plus"><Plus size={21} /></span><strong>Créer un tableau</strong><small>La prochaine belle idée commence ici.</small></button>}
      </div> : <section className="empty-state library-empty"><span className="empty-icon"><EmptyIcon size={24} /></span><h2>{query ? "Aucun résultat" : empty.title}</h2><p>{query ? "Essaie un autre mot-clé, ou efface ta recherche." : empty.text}</p>{query ? <button className="button-quiet" onClick={onClearSearch}>Effacer la recherche</button> : !isTrash && view !== "starred" && <button className="button-primary" onClick={onCreate}><Plus size={16} /> Créer mon premier tableau</button>}</section>}
      <div className="library-footnote"><Undo2 size={14} /> Tes tableaux supprimés restent ici jusqu’à ce que tu décides de les effacer.</div>
    </div>
  );
}
