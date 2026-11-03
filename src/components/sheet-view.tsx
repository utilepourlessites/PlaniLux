"use client";

import React from "react";
import type { SheetModel } from "@/lib/sheet-layout";
import type { ExportOptions } from "@/lib/exports";

type SheetViewProps = {
  model: SheetModel;
  options: ExportOptions;
  previewRef?: React.RefObject<HTMLDivElement | null>;
};

export function SheetView({ model, options, previewRef }: SheetViewProps) {
  const isPhone = options.format === "phone";
  const isDesktop = options.format === "desktop";

  const ratio = isPhone
    ? "9 / 16"
    : isDesktop
    ? "16 / 9"
    : options.orientation === "portrait"
    ? "0.707 / 1"
    : "1.414 / 1";

  const fontClass = `font-${options.font.toLowerCase()}`;
  const isPureWhite = options.whiteBackground;

  // Calcul du facteur d'échelle typographique adaptatif selon l'amplitude horaire
  const hourSpan = Math.max(1, model.hourEnd - model.hourStart);
  // Pour 14h (8-22) -> facteur ~1.0. Pour 6h (ex 4h-10h) -> facteur ~1.65
  const fontMultiplier = Math.max(1.0, Math.min(2.1, 14 / hourSpan));

  if (model.month) {
    const { monthLabel, weekdays, cells, eventsCount } = model.month;
    return (
      <div
        ref={previewRef}
        className={`export-paper sheet-unified ${fontClass} ${isPureWhite ? "paper-pure-white" : ""} ${isPhone ? "export-paper-phone" : ""}`}
        style={{
          aspectRatio: ratio,
          ["--font-multiplier" as any]: fontMultiplier,
        }}
      >
        <div className="export-paper-header">
          <div>
            {options.showTitle && <h2>{model.title}</h2>}
            {options.showDates && <span>{monthLabel.toUpperCase()} · VUE D’ENSEMBLE</span>}
          </div>
          {options.showLogo && (
            <span className="export-logo" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" width={14} height={14} style={{ borderRadius: 3, objectFit: "cover" }} /> PlaniLux
            </span>
          )}
        </div>

        <div className="sheet-month-grid" role="grid" aria-label={`Calendrier ${monthLabel}`}>
          <div className="sheet-month-weekdays">
            {weekdays.map((day) => (
              <span key={day}>{isPhone ? day.slice(0, 1) : day.slice(0, 3).toUpperCase()}</span>
            ))}
          </div>
          <div className="sheet-month-cells">
            {cells.map((cell, idx) => {
              if (cell.dayNumber === null) {
                return <div key={`empty-${idx}`} className="sheet-month-cell empty" />;
              }
              const visible = cell.events.slice(0, isPhone ? 2 : 3);
              const extraCount = cell.events.length - visible.length;
              return (
                <div key={cell.dateString ?? idx} className={`sheet-month-cell ${cell.isToday ? "today" : ""}`}>
                  <div className="sheet-month-cell-header">
                    <span className="sheet-month-day-num">{cell.dayNumber}</span>
                  </div>
                  <div className="sheet-month-cell-events">
                    {visible.map((event) => (
                      <div
                        key={event.id}
                        className="sheet-month-chip"
                        style={{
                          backgroundColor: isPureWhite ? "#f2eff7" : event.color,
                          borderLeftColor: event.color,
                        }}
                      >
                        {options.showTimes && <span className="chip-time">{event.start}</span>}
                        <strong className="chip-title">{event.title}</strong>
                      </div>
                    ))}
                    {extraCount > 0 && (
                      <span className="sheet-month-more">+{extraCount} de plus</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {options.showHoursSummary && model.employeesSummary && model.employeesSummary.length > 0 && (
          <div className="sheet-summary-section">
            <div className="sheet-summary-title">Récapitulatif des heures :</div>
            <div className="sheet-summary-chips">
              {model.employeesSummary.map((emp) => (
                <div key={emp.name} className="sheet-summary-chip">
                  <strong>{emp.name}</strong>: <span>{emp.formattedHours}</span> ({emp.count} créneau{emp.count > 1 ? "x" : ""})
                </div>
              ))}
            </div>
          </div>
        )}

        {options.showSignatureLine && (
          <div className="sheet-signature-row">
            <span>Signature / Validation : ____________________________</span>
            <span>Date : __________________</span>
          </div>
        )}

        <div className="export-paper-footer">
          <span>{eventsCount} créneau(x) ce mois-ci · Chaque chose à sa place.</span>
          <i>❋</i>
        </div>
      </div>
    );
  }

  // Disposition Hebdomadaire
  const { hourStart, hourEnd, hours, columns } = model;
  const hourStepPercent = 100 / Math.max(1, hourEnd - hourStart);

  return (
    <div
      ref={previewRef}
      className={`export-paper sheet-unified ${fontClass} ${isPureWhite ? "paper-pure-white" : ""} ${isPhone ? "export-paper-phone" : ""}`}
      style={{
        aspectRatio: ratio,
        ["--font-multiplier" as any]: fontMultiplier,
      }}
    >
      <div className="export-paper-header">
        <div>
          {options.showTitle && <h2>{model.title}</h2>}
          {options.showDates && <span>{model.subtitle.toUpperCase()}</span>}
        </div>
        {options.showLogo && (
          <span className="export-logo" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" width={14} height={14} style={{ borderRadius: 3, objectFit: "cover" }} /> PlaniLux
          </span>
        )}
      </div>

      <div className={`sheet-week-container ${isPhone ? "is-phone" : ""}`}>
        {/* Colonne des heures */}
        <div className="sheet-hour-scale" aria-hidden="true">
          <div className="sheet-hour-scale-head" />
          <div className="sheet-hour-scale-body">
            {hours.slice(0, -1).map((h) => (
              <div key={h} className="sheet-hour-label">
                <span>{String(h).padStart(2, "0")}h</span>
              </div>
            ))}
          </div>
        </div>

        {/* Colonnes des jours */}
        <div className="sheet-days-grid">
          {columns.map((col) => (
            <div key={col.dayIndex} className="sheet-day-column">
              <div className="sheet-day-head">
                <span className="sheet-day-name">{isPhone ? col.label.slice(0, 3) : col.shortLabel}</span>
                {options.showDates && (
                  <strong className={`sheet-day-date ${col.isToday ? "today" : ""}`}>
                    {col.date}
                  </strong>
                )}
              </div>

              <div className="sheet-day-track">
                {/* Lignes d'heures régulières */}
                {hours.slice(0, -1).map((h, i) => (
                  <div
                    key={h}
                    className="sheet-grid-line"
                    style={{ top: `${i * hourStepPercent}%` }}
                  />
                ))}

                {/* Événements placés avec centrage strict et contraste auto */}
                {col.events.length === 0 ? (
                  <div className="sheet-empty-day-note">
                    <span>Libre</span>
                  </div>
                ) : (
                  col.events.map((event) => {
                    const widthPercent = 100 / event.totalCols;
                    const leftPercent = (event.col / event.totalCols) * 100;
                    const bg = isPureWhite ? "#ffffff" : event.color;
                    const border = isPureWhite ? "#e2e8f0" : event.color;

                    return (
                      <div
                        key={event.id}
                        className="sheet-event-card sheet-event-centered"
                        style={{
                          top: `${event.topPercent}%`,
                          height: `${event.heightPercent}%`,
                          left: `calc(${leftPercent}% + 1px)`,
                          width: `calc(${widthPercent}% - 2px)`,
                          backgroundColor: bg,
                          borderColor: border,
                          color: isPureWhite ? "#0f172a" : event.textColor,
                        }}
                      >
                        <div
                          className="sheet-event-content-centered"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            textAlign: "center",
                            height: "100%",
                            width: "100%",
                            padding: "4px 6px",
                            boxSizing: "border-box",
                          }}
                        >
                          {options.showTimes && (
                            <div
                              className="sheet-event-time-badge"
                              style={{
                                fontSize: `calc(0.72rem * ${Math.min(1.5, fontMultiplier)})`,
                                color: isPureWhite ? "#475569" : event.secondaryTextColor,
                                fontWeight: 600,
                                marginBottom: 2,
                              }}
                            >
                              <span>{event.start} – {event.end}</span>
                              <span
                                className="duration-pill"
                                style={{
                                  display: "inline-block",
                                  marginLeft: 4,
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  fontSize: "0.85em",
                                  backgroundColor: "rgba(0, 0, 0, 0.08)",
                                }}
                              >
                                {event.formattedDuration}
                              </span>
                            </div>
                          )}

                          <strong
                            className="sheet-event-title"
                            style={{
                              fontSize: `calc(0.85rem * ${Math.min(1.6, fontMultiplier)})`,
                              lineHeight: 1.25,
                              color: isPureWhite ? "#0f172a" : event.textColor,
                            }}
                          >
                            {event.title}
                          </strong>

                          {event.teacher && event.heightPercent > 7 && (
                            <span
                              className="sheet-event-teacher"
                              style={{
                                fontSize: `calc(0.72rem * ${Math.min(1.4, fontMultiplier)})`,
                                color: isPureWhite ? "#334155" : event.secondaryTextColor,
                                marginTop: 2,
                              }}
                            >
                              👤 {event.teacher}
                            </span>
                          )}

                          {event.location && event.heightPercent > 10 && (
                            <span
                              className="sheet-event-location"
                              style={{
                                fontSize: `calc(0.68rem * ${Math.min(1.3, fontMultiplier)})`,
                                color: isPureWhite ? "#475569" : event.secondaryTextColor,
                                marginTop: 1,
                              }}
                            >
                              📍 {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {options.showHoursSummary && model.employeesSummary && model.employeesSummary.length > 0 && (
        <div className="sheet-summary-section">
          <div className="sheet-summary-title">Heures travaillées :</div>
          <div className="sheet-summary-grid">
            {model.employeesSummary.map((emp) => (
              <div key={emp.name} className="sheet-summary-card">
                <strong>{emp.name}</strong>
                <span>{emp.formattedHours}</span>
                <small>({emp.count} créneau{emp.count > 1 ? "x" : ""})</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {options.showSignatureLine && (
        <div className="sheet-signature-row">
          <span>Signature / Validation : ____________________________</span>
          <span>Date : __________________</span>
        </div>
      )}

      <div className="export-paper-footer">
        <span>Chaque chose à sa place. Et du temps pour toi aussi.</span>
        <i>❋</i>
      </div>
    </div>
  );
}
