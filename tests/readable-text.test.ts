import { describe, expect, it } from "vitest";
import { EVENT_COLORS, getReadableTextColor } from "@/lib/planner-types";

describe("getReadableTextColor", () => {
  it("uses light text on very dark or deep saturated backgrounds", () => {
    expect(getReadableTextColor("#d9383e")).toBe("#ffffff"); // Rouge
    expect(getReadableTextColor("#c2185b")).toBe("#ffffff"); // Fuchsia
    expect(getReadableTextColor("#7548f0")).toBe("#ffffff"); // Violet vif
    expect(getReadableTextColor("#25242b")).toBe("#ffffff"); // Noir
  });

  it("uses dark text on pastel, pale, yellow or medium-luminance backgrounds", () => {
    expect(getReadableTextColor("#e8e5ff")).toBe("#20202a"); // Lavande
    expect(getReadableTextColor("#dcf3e8")).toBe("#20202a"); // Menthe
    expect(getReadableTextColor("#ffeadf")).toBe("#20202a"); // Pêche
    expect(getReadableTextColor("#e1efff")).toBe("#20202a"); // Ciel
    expect(getReadableTextColor("#fff3cf")).toBe("#20202a"); // Citron
    expect(getReadableTextColor("#ffe3ea")).toBe("#20202a"); // Rose
    expect(getReadableTextColor("#e9edf2")).toBe("#20202a"); // Perle
    expect(getReadableTextColor("#f36d5c")).toBe("#20202a"); // Corail
    expect(getReadableTextColor("#ffd83d")).toBe("#20202a"); // Jaune soleil
    expect(getReadableTextColor("#147deb")).toBe("#20202a"); // Bleu vif (WCAG contrast favors dark text)
    expect(getReadableTextColor("#00a6a6")).toBe("#20202a"); // Turquoise
    expect(getReadableTextColor("#20a464")).toBe("#20202a"); // Vert vif
  });

  it("assigns valid contrast to every color in EVENT_COLORS palette", () => {
    for (const item of EVENT_COLORS) {
      const textColor = getReadableTextColor(item.value);
      expect(["#ffffff", "#20202a"]).toContain(textColor);
    }
  });

  it("handles malformed colors with a dark fallback", () => {
    expect(getReadableTextColor("invalid")).toBe("#20202a");
    expect(getReadableTextColor("")).toBe("#20202a");
  });
});
