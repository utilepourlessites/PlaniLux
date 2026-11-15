import { describe, expect, it } from "vitest";
import { validateBoardCreate, validateBoardPatch, validateEvents, validateProfileUpdate, MAX_EVENTS } from "@/lib/board-validation";

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

describe("validateEvents", () => {
  it("refuse des heures mal formées", () => {
    expect(validateEvents([{ ...event, start: "8h30" }]).ok).toBe(false);
  });
  it("refuse des heures impossibles (hors 00:00-23:59)", () => {
    expect(validateEvents([{ ...event, start: "29:88" }]).ok).toBe(false);
    expect(validateEvents([{ ...event, start: "12:60" }]).ok).toBe(false);
    expect(validateEvents([{ ...event, start: "24:00" }]).ok).toBe(false);
    expect(validateEvents([{ ...event, end: "25:00" }]).ok).toBe(false);
  });
  it("refuse un intervalle inversé ou nul (end <= start)", () => {
    expect(validateEvents([{ ...event, start: "10:00", end: "09:00" }]).ok).toBe(false);
    expect(validateEvents([{ ...event, start: "10:00", end: "10:00" }]).ok).toBe(false);
  });
  it("accepte des heures limites valides (00:00 et 23:59)", () => {
    expect(validateEvents([{ ...event, start: "00:00", end: "23:59" }]).ok).toBe(true);
  });
  it("valide les dates réelles au format ISO (date, validFrom, validTo)", () => {
    expect(validateEvents([{ ...event, date: "2026-02-30" }]).ok).toBe(false);
    expect(validateEvents([{ ...event, date: "2026-02-28" }]).ok).toBe(true);
    expect(validateEvents([{ ...event, validFrom: "2026-10-01", validTo: "2026-09-01" }]).ok).toBe(false);
    expect(validateEvents([{ ...event, validFrom: "2026-09-01", validTo: "2026-10-01" }]).ok).toBe(true);
  });
  it("valide la récurrence (weekly ou none)", () => {
    expect(validateEvents([{ ...event, recurrence: "weekly" }]).ok).toBe(true);
    expect(validateEvents([{ ...event, recurrence: "none" }]).ok).toBe(true);
    expect(validateEvents([{ ...event, recurrence: "monthly" }]).ok).toBe(false);
  });
  it("refuse trop d'événements", () => {
    expect(validateEvents(Array.from({ length: MAX_EVENTS + 1 }, () => event)).ok).toBe(false);
  });
  it("supprime les champs inconnus", () => {
    const result = validateEvents([{ ...event, malicious: "<script>" }]);
    expect(result.ok && "malicious" in result.value[0]).toBe(false);
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
