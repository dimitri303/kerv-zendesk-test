import { describe, it, expect } from "vitest";
import { harmoniseMelody } from "./melodyHarmonisation";

describe("harmoniseMelody", () => {
  it("suggests C major triads for an arpeggio-like C E G melody", () => {
    const r = harmoniseMelody(["C4", "E4", "G4", "E4", "C4"]);
    expect(r.key?.tonic).toBe("C");
    expect(r.suggestions.some((s) => s.symbol === "C" && s.tier === "conventional")).toBe(true);
  });

  it("returns empty for an empty melody", () => {
    const r = harmoniseMelody([]);
    expect(r.suggestions).toEqual([]);
    expect(r.key).toBeNull();
  });

  it("groups suggestions into conventional/colourful/unexpected", () => {
    const r = harmoniseMelody(["E4", "G4", "A4", "G4", "E4"], { tonic: "C", mode: "major" });
    const tiers = new Set(r.suggestions.map((s) => s.tier));
    expect(tiers.has("conventional")).toBe(true);
  });
});
