import { describe, it, expect } from "vitest";
import { analyzeProgression } from "./progressionAnalysis";

describe("analyzeProgression - diatonic progression", () => {
  it("labels I-IV-V-vi in C major with correct roman numerals", () => {
    const r = analyzeProgression(["C", "F", "G", "Am"], { tonic: "C", mode: "major" });
    expect(r.chords.map((c) => c.romanNumeral)).toEqual(["I", "IV", "V", "vi"]);
    expect(r.chords.every((c) => c.diatonic)).toBe(true);
    expect(r.chords.every((c) => c.category === "diatonic")).toBe(true);
  });
});

describe("analyzeProgression - secondary dominants", () => {
  it("identifies A7 as V7/ii in C major", () => {
    const r = analyzeProgression(["C", "A7", "Dm", "G7"], { tonic: "C", mode: "major" });
    expect(r.chords[1].category).toBe("secondary-dominant");
    expect(r.chords[1].diatonic).toBe(false);
  });
});

describe("analyzeProgression - borrowed / modal interchange", () => {
  it("identifies Ab (bVI) borrowed from parallel minor in C major", () => {
    const r = analyzeProgression(["C", "Ab", "Bb", "C"], { tonic: "C", mode: "major" });
    expect(r.chords[1].category).toBe("modal-interchange");
    expect(r.chords[1].romanNumeral).toBe("bVI");
  });
});

describe("analyzeProgression - non-diatonic notes are not treated as mistakes", () => {
  it("labels a bluesy bVII without flagging it as an error", () => {
    const r = analyzeProgression(["G", "F", "C", "G"], { tonic: "G", mode: "major" });
    const f = r.chords[1];
    expect(f.romanNumeral).toBe("bVII");
    expect(f.diatonic).toBe(false);
    // Mixolydian b7 = parallel-minor's bVII too, so this is correctly read
    // as modal interchange rather than a generic "wrong note" catch-all -
    // either way it must never read as an error/mistake.
    expect(f.explanation).not.toMatch(/mistake|error|wrong/i);
  });
});

describe("analyzeProgression - common tones and bass movement", () => {
  it("finds the shared note between C and Am (relative chords)", () => {
    const r = analyzeProgression(["C", "Am"], { tonic: "C", mode: "major" });
    expect(new Set(r.pairs[0].commonTones)).toEqual(new Set(["C", "E"]));
  });

  it("computes smooth chromatic bass motion for C -> C/B -> Am", () => {
    const r = analyzeProgression(["C", "C/B", "Am"], { tonic: "C", mode: "major" });
    expect(r.pairs[0].bassMotionSemitones).toBe(-1);
  });
});

describe("analyzeProgression - deceptive resolution", () => {
  it("flags V -> vi as a deceptive resolution", () => {
    const r = analyzeProgression(["C", "F", "G", "Am"], { tonic: "C", mode: "major" });
    expect(r.pairs[2].deceptiveResolution).toBe(true);
  });

  it("flags V -> I as conventional, not deceptive", () => {
    const r = analyzeProgression(["F", "G", "C"], { tonic: "C", mode: "major" });
    expect(r.pairs[1].deceptiveResolution).toBe(false);
    expect(r.pairs[1].dominantResolvesConventionally).toBe(true);
  });
});
