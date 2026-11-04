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
