import { describe, it, expect } from "vitest";
import { suggestNextChords, chordsContainingNote, slashChordsOverBass } from "./suggestions";

const cMajor = { tonic: "C", mode: "major" as const };

describe("suggestNextChords - determinism (no randomness)", () => {
  it("returns identical results across repeated calls", () => {
    const a = suggestNextChords("C", cMajor);
    const b = suggestNextChords("C", cMajor);
    expect(a).toEqual(b);
  });
});

describe("suggestNextChords - grouping", () => {
  const suggestions = suggestNextChords("C", cMajor);

  it("includes diatonic chords in the conventional tier", () => {
    const conventional = suggestions.filter((s) => s.tier === "conventional");
    expect(conventional.some((s) => s.symbol === "F")).toBe(true);
    expect(conventional.some((s) => s.symbol === "G")).toBe(true);
    expect(conventional.every((s) => s.technique === "diatonic")).toBe(true);
  });

  it("includes secondary dominants in the colourful tier", () => {
    const colourful = suggestions.filter((s) => s.tier === "colourful");
    expect(colourful.some((s) => s.symbol === "D7")).toBe(true); // V7/V
  });

  it("includes tritone subs in the adventurous tier", () => {
    const adventurous = suggestions.filter((s) => s.tier === "adventurous");
    expect(adventurous.some((s) => s.technique === "tritone-sub")).toBe(true);
  });

  it("includes a what-the-hell tier with an explanation each", () => {
    const wth = suggestions.filter((s) => s.tier === "what-the-hell");
    expect(wth.length).toBeGreaterThan(0);
    expect(wth.every((s) => s.explanation.length > 0)).toBe(true);
  });

  it("never suggests the current chord itself", () => {
    expect(suggestions.every((s) => s.symbol !== "C")).toBe(true);
  });
});

describe("chordsContainingNote", () => {
  it("suggests diatonic chords containing E in C major", () => {
    const r = chordsContainingNote("E", cMajor);
    expect(r.some((s) => s.symbol === "Cmaj7")).toBe(true);
    expect(r.some((s) => s.symbol === "Am7")).toBe(true);
  });
});

describe("slashChordsOverBass", () => {
  it("suggests inversions over a chosen bass note", () => {
    const r = slashChordsOverBass("B", cMajor);
    const gOverB = r.find((s) => s.symbol === "G/B");
    expect(gOverB?.tier).toBe("conventional");
  });
});
