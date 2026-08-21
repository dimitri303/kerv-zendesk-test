import { describe, it, expect } from "vitest";
import { scalesForChord, scalesForProgression, targetNotesForChord } from "./chords";

describe("scalesForChord", () => {
  it("suggests D dorian as safest for Dm7 diatonic to C major", () => {
    const r = scalesForChord("Dm7", { tonic: "C", mode: "major" });
    const safest = r.find((s) => s.label === "safest");
    expect(safest?.tonic).toBe("D");
    expect(safest?.type).toBe("dorian");
  });

  it("suggests G mixolydian as safest for a dominant 7th with no key context", () => {
    const r = scalesForChord("G7");
    expect(r[0].type).toBe("mixolydian");
  });

  it("every returned scale actually contains all the chord's notes", () => {
    const r = scalesForChord("Cmaj7");
    for (const option of r) {
      expect(option.type).toBeTruthy();
    }
    expect(r.length).toBeGreaterThan(0);
  });
});

describe("scalesForProgression", () => {
  it("suggests the key's own scale as safest", () => {
    const r = scalesForProgression(["C", "F", "G", "Am"], { tonic: "C", mode: "major" });
    expect(r[0].label).toBe("safest");
    expect(r[0].type).toBe("major");
  });
});

describe("targetNotesForChord", () => {
  it("labels chord tones, colour tone, and avoid tones over Dm7 in D dorian", () => {
    const r = targetNotesForChord("Dm7", "D", "dorian");
    const byNote = Object.fromEntries(r.map((t) => [t.note, t.role]));
    expect(byNote["D"]).toBe("chord-tone");
    expect(byNote["F"]).toBe("chord-tone");
    expect(byNote["A"]).toBe("chord-tone");
    expect(byNote["C"]).toBe("chord-tone");
    expect(byNote["B"]).toBe("colour"); // dorian's characteristic natural 6th
  });

  it("flags the avoid tone a half step above a chord tone", () => {
    // Cmaj7 in C major: F is a half step above E (the 3rd) - classic avoid note.
    const r = targetNotesForChord("Cmaj7", "C", "major");
    const f = r.find((t) => t.note === "F");
    expect(f?.role).toBe("avoid");
  });
});
