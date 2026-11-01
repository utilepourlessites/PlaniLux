"use client";

import { useMemo } from "react";
import {
  ArrowRight, CalendarCheck2, CalendarDays, ChevronRight, Clock3, Plus, Sparkles, Zap, Check,
} from "lucide-react";
import { BOARD_KIND_LABELS } from "@/lib/planner-types";
import type { PlannerBoard } from "@/lib/planner-types";
import type { PlannerView } from "@/components/planner-sidebar";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function MiniWeek({ board, onOpen }: { board: PlannerBoard; onOpen: () => void }) {
  const eventsByDay = useMemo(() => {
    const map = new Map<number, PlannerBoard["events"]>();
    for (const ev of board.events) {
      const list = map.get(ev.day) ?? [];
      list.push(ev);
      map.set(ev.day, list);
    }
    return map;
  }, [board]);

  return (
    <div className="mini-week" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}>
      {DAY_LABELS.map((label, dayIndex) => {
        const events = (eventsByDay.get(dayIndex) ?? []).slice(0, 3);
        return (
          <div key={label} className="mini-day">
            <span className="mini-day-name">{label}</span>
            <div className="mini-slot-stack">
              {events.length ? events.map((ev) => (
                <span
                  key={ev.id}
                  className="mini-event-pill"
                  style={{ background: ev.color }}
                  title={`${ev.title} (${ev.start} - ${ev.end})`}
                >
                  {ev.title}
                </span>
              )) : <span className="mini-empty-dot" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardTile({ board, onOpen }: { board: PlannerBoard; onOpen: () => void }) {
  const count = board.events.length;
  return (
    <button className="overview-board-tile" onClick={onOpen}>
      <span className="tile-color-bar" style={{ background: board.color }} />
      <div className="tile-content">
        <strong>{board.title}</strong>
        <span>{BOARD_KIND_LABELS[board.kind]} · {count} créneau{count === 1 ? "" : "x"}</span>
      </div>
      <ChevronRight size={16} className="tile-chevron" />
    </button>
  );
}

export function Overview({
  boards,
  onCreate,
  onOpen,
  onNavigate,
  userName = "",
}: {
  boards: PlannerBoard[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onNavigate: (view: PlannerView) => void;
  userName?: string;
}) {
  const featured = boards.find((board) => board.favorite) ?? boards[0];
  const eventCount = boards.reduce((total, board) => total + board.events.length, 0);
  const date = new Date();
  const dateText = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(date);
  const displayName = userName?.trim() ? userName.split(" ")[0] : "";

  const todayDay = (date.getDay() + 6) % 7; // 0 = Lundi, 6 = Dimanche
  const todayEvents = useMemo(() => {
    return boards
      .filter((b) => !b.isDeleted)
      .flatMap((b) => b.events)
      .filter((ev) => ev.day === todayDay)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 3);
  }, [boards, todayDay]);

  return (
    <div className="overview-page">
      <div className="page-heading overview-heading">
        <div>
          <div className="eyebrow-date"><span className="live-dot" /> {dateText}</div>
          <h1>{displayName ? `Bonjour ${displayName}` : "Bienvenue"} <span className="wave-emoji">☀️</span></h1>
          <p>Organisez votre temps et vos projets en toute sérénité.</p>
        </div>
        <button className="button-primary desktop-create" onClick={onCreate}><Plus size={17} /> Nouveau tableau</button>
      </div>

      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="banner-overline"><Sparkles size={13} /> TON ESPACE, TON RYTHME</span>
          <h2>Une organisation claire.<br /><em>Pensée pour vous.</em></h2>
          <p>Chaque créneau à sa place, accessible en un coup d’œil.</p>
          {featured ? (
            <button className="banner-link" onClick={() => onOpen(featured.id)}>Voir mon planning <ArrowRight size={15} /></button>
          ) : (
            <button className="banner-link" onClick={onCreate}>Créer mon premier planning <ArrowRight size={15} /></button>
          )}
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="banner-orbit orbit-one" /><div className="banner-orbit orbit-two" />
          <div className="banner-sun"><Sparkles size={29} strokeWidth={1.5} /></div>
          <span className="banner-sparkle sparkle-a">✶</span><span className="banner-sparkle sparkle-b">✦</span><span className="banner-sparkle sparkle-c">·</span>
        </div>
        <div className="banner-grain" />
      </section>

      <div className="overview-stats">
        <article className="stat-card">
          <span className="stat-icon stat-lilac"><CalendarDays size={17} /></span>
          <div><span>MES TABLEAUX</span><strong>{boards.length.toString().padStart(2, "0")}</strong></div>
          <small className="stat-caption">un espace pour chaque projet</small>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-mint"><CalendarCheck2 size={17} /></span>
          <div><span>CRÉNEAUX PLANIFIÉS</span><strong>{eventCount.toString().padStart(2, "0")}</strong></div>
          <small className="stat-caption">à votre rythme, sans surcharge</small>
        </article>
        <article className="stat-card stat-quote-card">
          <span className="stat-icon stat-peach"><Zap size={17} /></span>
          <div><span>VOTRE ESPACE</span><strong>PlaniLux</strong></div>
          <small className="stat-caption">prêt pour vos plannings</small>
        </article>
      </div>

      <div className="overview-columns">
        <section className="overview-section week-overview-card">
          <div className="section-heading">
            <div><div className="section-eyebrow">APERÇU</div><h2>La semaine en cours</h2></div>
            {featured && <button className="text-link" onClick={() => onOpen(featured.id)}>Ouvrir le planning <ChevronRight size={15} /></button>}
          </div>
          {featured ? (
            <>
              <button className="week-range week-range-btn" onClick={() => onOpen(featured.id)} aria-label={`Ouvrir ${featured.title}`}>
                <span className="range-dot" style={{ background: featured.color }} />
                <span>{featured.title}</span>
                <span className="range-chevron"><ChevronRight size={14} /></span>
              </button>
              <MiniWeek board={featured} onOpen={() => onOpen(featured.id)} />
            </>
          ) : (
            <button className="week-empty" onClick={onCreate}><Plus size={16} /> Créer votre premier planning</button>
          )}
          <div className="week-footer">
            <button onClick={() => onNavigate("boards")}>Tous mes tableaux <ArrowRight size={14} /></button>
          </div>
        </section>

        <section className="overview-section today-card">
          <div className="section-heading today-heading">
            <div><div className="section-eyebrow">AUJOURD’HUI</div><h2>Programme du jour</h2></div>
            <span className="today-sparkle"><Clock3 size={17} /></span>
          </div>
          {todayEvents.length > 0 ? (
            <div className="today-schedule-list">
              {todayEvents.map((ev) => (
                <div key={ev.id} className="today-task" style={{ borderLeft: `3px solid ${ev.color}` }}>
                  <span className="task-check"><Check size={11} /></span>
                  <div>
                    <strong>{ev.title}</strong>
                    <small>{ev.start} - {ev.end} {ev.location ? `· ${ev.location}` : ""}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="today-reminder">
              <span className="reminder-icon"><Clock3 size={16} /></span>
              <div>
                <strong>Rien de prévu aujourd’hui.</strong>
                <p>Aucun créneau planifié pour ce jour.</p>
              </div>
            </div>
          )}
          <div className="today-footer"><span>Planning personnel et synchronisé.</span></div>
        </section>
      </div>

      <section className="overview-section boards-overview-section">
        <div className="section-heading boards-heading">
          <div><div className="section-eyebrow">VOS PROJETS</div><h2>Accéder rapidement à vos plannings</h2></div>
          <button className="text-link" onClick={() => onNavigate("boards")}>Tous mes tableaux <ChevronRight size={15} /></button>
        </div>
        {boards.length ? (
          <div className="overview-board-grid">
            {boards.slice(0, 3).map((board) => (
              <BoardTile key={board.id} board={board} onOpen={() => onOpen(board.id)} />
            ))}
          </div>
        ) : (
          <button className="create-first-board" onClick={onCreate}>
            <span><Plus size={17} /></span>
            <strong>Créer votre premier tableau</strong>
            <small>Votre espace de planning est prêt</small>
          </button>
        )}
      </section>
    </div>
  );
}
