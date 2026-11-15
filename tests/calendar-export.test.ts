import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildIcsContent,
  generateCalendarToken,
  getCalendarSigningKey,
  getFirstOccurrenceDate,
} from "@/app/api/boards/[id]/calendar/route";
import type { ScheduleEvent } from "@/lib/planner-types";

describe("Calendar Token & Secret", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CALENDAR_SIGNING_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("lève une erreur si aucun secret serveur n'est configuré", () => {
    expect(() => getCalendarSigningKey()).toThrow();
    expect(() => generateCalendarToken("123e4567-e89b-12d3-a456-426614174000")).toThrow();
  });

  it("n'utilise JAMAIS la clé publique anon comme clé de repli", () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    expect(() => getCalendarSigningKey()).toThrow();
  });

  it("génère un jeton HMAC valide et reproductible avec CALENDAR_SIGNING_SECRET", () => {
    process.env.CALENDAR_SIGNING_SECRET = "super-secret-key-123";
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const token1 = generateCalendarToken(id);
    const token2 = generateCalendarToken(id);
    expect(token1).toBe(token2);
    expect(token1.length).toBe(24);
  });
});

describe("ICS Generation", () => {
  const fixedNow = new Date("2026-11-15T12:00:00.000Z");

  const sampleEvent: ScheduleEvent = {
    id: "evt-1",
    title: "Algorithmique",
    day: 0, // Lundi
    start: "08:30",
    end: "10:00",
    color: "#e8e5ff",
    teacher: "Prof. Turing",
    location: "Salle A201",
    notes: "Apporter support",
  };

  it("inclut les métadonnées VTIMEZONE pour Europe/Paris et un DTSTAMP UTC", () => {
    const ics = buildIcsContent("Semestre 1", [sampleEvent], false, { now: fixedNow });
    expect(ics).toContain("X-WR-TIMEZONE:Europe/Paris");
    expect(ics).toContain("BEGIN:VTIMEZONE");
    expect(ics).toContain("TZID:Europe/Paris");
    expect(ics).toContain("DTSTAMP:20261115T120000Z");
  });

  it("formate DTSTART et DTEND avec TZID=Europe/Paris", () => {
    const ics = buildIcsContent("Semestre 1", [sampleEvent], false, { now: fixedNow });
    expect(ics).toContain("DTSTART;TZID=Europe/Paris:");
    expect(ics).toContain("DTEND;TZID=Europe/Paris:");
  });

  it("génère une récurrence hebdomadaire par défaut pour un planning de cours", () => {
    const ics = buildIcsContent("Semestre 1", [sampleEvent], false, { now: fixedNow });
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO");
  });

  it("respecte la borne validTo pour limiter la récurrence UNTIL", () => {
    const eventWithEnd: ScheduleEvent = {
      ...sampleEvent,
      validTo: "2026-12-31",
    };
    const ics = buildIcsContent("Semestre 1", [eventWithEnd], false, { now: fixedNow });
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231T235959Z");
  });

  it("ne génère pas de RRULE si recurrence === 'none'", () => {
    const oneOffEvent: ScheduleEvent = {
      ...sampleEvent,
      recurrence: "none",
    };
    const ics = buildIcsContent("Semestre 1", [oneOffEvent], false, { now: fixedNow });
    expect(ics).not.toContain("RRULE:FREQ=WEEKLY");
  });

  it("gère les événements mensuels avec date spécifique", () => {
    const monthlyEvent: ScheduleEvent = {
      ...sampleEvent,
      date: "2026-12-25",
    };
    const ics = buildIcsContent("Mensuel", [monthlyEvent], true, { now: fixedNow });
    expect(ics).toContain("DTSTART;TZID=Europe/Paris:20261225T083000");
    expect(ics).toContain("DTEND;TZID=Europe/Paris:20261225T100000");
    expect(ics).not.toContain("RRULE:FREQ=WEEKLY");
  });
});

describe("getFirstOccurrenceDate", () => {
  it("calcule la bonne date sur ou après validFrom", () => {
    // 2026-09-01 est un Mardi (day = 1)
    // Si l'événement est le Lundi (day = 0), le premier lundi sur/après le 1er sept est le 7 sept 2026
    const dt = getFirstOccurrenceDate(0, "2026-09-01");
    expect(dt.getFullYear()).toBe(2026);
    expect(dt.getMonth()).toBe(8); // Septembre (0-indexed)
    expect(dt.getDate()).toBe(7);
  });
});
