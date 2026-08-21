import { describe, it, expect } from "vitest";
import { soundingNotes, soundingPitchClasses, bassNote } from "./guitar";
import { BUILT_IN_TUNINGS } from "./tunings";

const standard = BUILT_IN_TUNINGS.find((t) => t.id === "standard-6")!;
const dadgad = BUILT_IN_TUNINGS.find((t) => t.id === "dadgad-6")!;

describe("soundingNotes - standard tuning, no capo", () => {
  it("computes an open E major chord shape (0 2 2 1 0 0)", () => {
    const notes = soundingNotes(standard, 0, { frets: [0, 2, 2, 1, 0, 0] });
    expect(notes.map((n) => n.note)).toEqual(["E2", "B2", "E3", "Ab3", "B3", "E4"]);
  });
});

describe("soundingNotes - capo transposition", () => {
  it("standard tuning, capo 2, G shape (3 2 0 0 0 3) sounds as A major", () => {
    const notes = soundingNotes(standard, 2, { frets: [3, 2, 0, 0, 0, 3] });
    expect(notes.map((n) => n.note)).toEqual(["A2", "Db3", "E3", "A3", "Db4", "A4"]);
  });

  it("standard tuning, capo 2, G shape produces the pitch classes of A major", () => {
    const pcs = soundingPitchClasses(standard, 2, { frets: [3, 2, 0, 0, 0, 3] });
    expect(new Set(pcs)).toEqual(new Set(["A", "Db", "E"]));
  });
});

describe("soundingNotes - muted strings", () => {
  it("returns null for muted strings", () => {
    const notes = soundingNotes(standard, 0, { frets: ["x", 3, 2, 0, 1, 0] }); // C major
    expect(notes[0].note).toBeNull();
    expect(notes[0].midi).toBeNull();
  });
});

describe("soundingNotes - custom tuning (DADGAD)", () => {
  it("computes an open DADGAD chord (all open strings)", () => {
    const notes = soundingNotes(dadgad, 0, { frets: [0, 0, 0, 0, 0, 0] });
    expect(notes.map((n) => n.note)).toEqual(["D2", "A2", "D3", "G3", "A3", "D4"]);
    const pcs = soundingPitchClasses(dadgad, 0, { frets: [0, 0, 0, 0, 0, 0] });
    expect(new Set(pcs)).toEqual(new Set(["D", "A", "G"]));
  });
});

describe("bassNote", () => {
  it("finds the lowest sounding note", () => {
    const bass = bassNote(standard, 0, { frets: ["x", 3, 2, 0, 1, 0] }); // C major, A string bass
    expect(bass?.note).toBe("C3");
  });
});
