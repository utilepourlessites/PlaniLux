import { describe, expect, it } from "vitest";
import {
  validateBoardCreate,
  validateBoardPatch,
  validateEvents,
  validateProfileUpdate,
  isValidCalendarDate,
  MAX_EVENTS,
} from "@/lib/board-validation";
import { getHourRange } from "@/lib/sheet-layout";

const event = { id: "e1", title: "Maths", day: 0, start: "08:30", end: "10:00", color: "#e8e5ff" };

describe("validateBoardCreate", () => {
  it("accepte un tableau valide et nettoie le titre", () => {
    const result = validateBoardCreate({ title: "  Mon Planning  ", kind: "school", events: [event] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Mon Planning");
      expect(result.value.color).toBe("#c6b8f5");
    }
  });

  it("refuse un titre vide ou trop long", () => {
    expect(validateBoardCreate({ title: " ", kind: "school" }).ok).toBe(false);
    expect(validateBoardCreate({ title: "x".repeat(101), kind: "school" }).ok).toBe(false);
  });

  it("refuse un modèle inconnu et une couleur invalide", () => {
    expect(validateBoardCreate({ title: "A", kind: "autre" }).ok).toBe(false);
    expect(validateBoardCreate({ title: "A", kind: "weekly", color: "rouge" }).ok).toBe(false);
  });

  it("ignore un identifiant qui n'est pas un UUID", () => {
    const result = validateBoardCreate({ id: "pas-un-uuid", title: "A", kind: "daily" });
    expect(result.ok && result.value.id).toBeFalsy();
  });
});

describe("validateEvents & Validation Horaire", () => {
  it("refuse des heures mal formées", () => {
    expect(validateEvents([{ ...event, start: "8h30" }]).ok).toBe(false);
  });

  it("refuse un événement si end <= start (ex. 10:00 <= 10:00 ou 09:00 <= 10:00)", () => {
    expect(validateEvents([{ ...event, start: "10:00", end: "10:00" }]).ok).toBe(false);
    expect(validateEvents([{ ...event, start: "14:00", end: "13:30" }]).ok).toBe(false);
    expect(validateEvents([{ ...event, start: "04:00", end: "10:00" }]).ok).toBe(true);
  });

  it("valide les dates calendaires (date, validFrom, validTo)", () => {
    expect(isValidCalendarDate("2026-02-28")).toBe(true);
    expect(isValidCalendarDate("2026-02-31")).toBe(false);
    expect(isValidCalendarDate("2026-13-01")).toBe(false);
    expect(isValidCalendarDate("not-a-date")).toBe(false);

    expect(validateEvents([{ ...event, date: "2026-05-15" }]).ok).toBe(true);
    expect(validateEvents([{ ...event, date: "2026-02-31" }]).ok).toBe(false);
    expect(validateEvents([{ ...event, validFrom: "2026-01-01", validTo: "2026-12-31" }]).ok).toBe(true);
    expect(validateEvents([{ ...event, validFrom: "2026-12-31", validTo: "2026-01-01" }]).ok).toBe(false);
  });

  it("refuse trop d'événements", () => {
    expect(validateEvents(Array.from({ length: MAX_EVENTS + 1 }, () => event)).ok).toBe(false);
  });

  it("supprime les champs inconnus", () => {
    const result = validateEvents([{ ...event, malicious: "<script>" }]);
    expect(result.ok && "malicious" in result.value[0]).toBe(false);
  });
});

describe("Calcul de plage dynamique getHourRange", () => {
  it("retourne la plage par défaut 8..20 quand aucun événement", () => {
    const range = getHourRange([]);
    expect(range.start).toBe(8);
    expect(range.end).toBe(20);
  });

  it("recadre intelligemment sur les heures actives (ex. cas 04:00 - 10:00)", () => {
    const earlyEvents = [{ ...event, start: "04:00", end: "10:00" }];
    const autoRange = getHourRange(earlyEvents, 8, 20, true);
    expect(autoRange.start).toBe(4);
    expect(autoRange.end).toBe(10);
  });

  it("utilise la plage standard étendue sans autoCrop", () => {
    const earlyEvents = [{ ...event, start: "04:00", end: "10:00" }];
    const defaultRange = getHourRange(earlyEvents, 8, 20, false);
    expect(defaultRange.start).toBe(4);
    expect(defaultRange.end).toBe(20);
  });
});

describe("validateBoardPatch", () => {
  it("accepte une corbeille et un favori", () => {
    expect(validateBoardPatch({ isDeleted: true, favorite: false }).ok).toBe(true);
  });

  it("refuse des types invalides", () => {
    expect(validateBoardPatch({ isDeleted: "oui" }).ok).toBe(false);
    expect(validateBoardPatch("n'importe quoi").ok).toBe(false);
  });
});

describe("validateProfileUpdate", () => {
  it("accepte une mise à jour de profil valide", () => {
    const res = validateProfileUpdate({ displayName: "Alex", workspaceName: "Studio" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.displayName).toBe("Alex");
      expect(res.value.workspaceName).toBe("Studio");
    }
  });

  it("refuse un nom trop long", () => {
    expect(validateProfileUpdate({ displayName: "a".repeat(61) }).ok).toBe(false);
    expect(validateProfileUpdate({ workspaceName: "w".repeat(61) }).ok).toBe(false);
  });
});
