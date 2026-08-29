import { describe, it, expect } from "vitest";
import { findChordVoicings } from "./voicingFinder";
import { soundingPitchClasses } from "./guitar";
import { BUILT_IN_TUNINGS } from "./tunings";
import { Chord, Note } from "tonal";

const standard = BUILT_IN_TUNINGS.find((t) => t.id === "standard-6")!;
const openG = BUILT_IN_TUNINGS.find((t) => t.id === "open-g-6")!;

function chroma(pc: string) {
  return Note.chroma(pc);
}

describe("findChordVoicings - standard tuning", () => {
  it("finds a playable C major shape in standard tuning, no capo", () => {
    const voicings = findChordVoicings("C", standard, 0);
    expect(voicings.length).toBeGreaterThan(0);
    const pcs = soundingPitchClasses(standard, 0, voicings[0]);
    const chromas = new Set(pcs.map(chroma));
    // Every sounding note must actually be a C major chord tone.
    const targetChromas = new Set(Chord.get("C").notes.map(chroma));
    for (const c of chromas) expect(targetChromas.has(c)).toBe(true);
    expect(chromas.has(chroma("C"))).toBe(true); // root present
  });

  it("finds a G7 shape", () => {
    const voicings = findChordVoicings("G7", standard, 0);
    expect(voicings.length).toBeGreaterThan(0);
  });
});

describe("findChordVoicings - Open G tuning (the reported gap)", () => {
  it("finds a G major voicing as a straight barre across all strings", () => {
    const voicings = findChordVoicings("G", openG, 0);
    expect(voicings.length).toBeGreaterThan(0);
    // Open G tuning's open strings already spell a G major chord, so the
    // top-ranked voicing should be all-open (fret 0 everywhere).
    expect(voicings[0].frets).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("finds a C major voicing in Open G (not just the tuning's native chord)", () => {
    const voicings = findChordVoicings("C", openG, 0);
    expect(voicings.length).toBeGreaterThan(0);
    const pcs = soundingPitchClasses(openG, 0, voicings[0]);
    const chromas = new Set(pcs.map(chroma));
    const targetChromas = new Set(Chord.get("C").notes.map(chroma));
    for (const c of chromas) expect(targetChromas.has(c)).toBe(true);
  });

  it("respects capo when finding voicings", () => {
    // Open G tuning, capo 2 -> open strings alone now sound A major, so an
    // all-open shape should be the top A major voicing.
    const voicings = findChordVoicings("A", openG, 2);
    expect(voicings[0].frets).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("findChordVoicings - playability constraints", () => {
  it("never returns a shape exceeding the default fret span", () => {
    const voicings = findChordVoicings("Cmaj7", standard, 0);
    for (const v of voicings) {
      const fretted = v.frets.filter((f): f is number => typeof f === "number" && f > 0);
      if (fretted.length > 0) {
        expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThanOrEqual(4);
      }
    }
  });

  it("returns [] for an unparseable chord symbol", () => {
    expect(findChordVoicings("not-a-chord", standard, 0)).toEqual([]);
  });
});
