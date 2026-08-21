import { describe, it, expect } from "vitest";
import { detectChord } from "./chordDetection";

describe("detectChord - basic triads", () => {
  it("detects a C major triad", () => {
    const r = detectChord(["C4", "E4", "G4"]);
    expect(r.best?.symbol).toBe("C");
  });

  it("detects an A minor triad", () => {
    const r = detectChord(["A3", "C4", "E4"]);
    expect(r.best?.symbol).toBe("Am");
  });

  it("detects a power chord", () => {
    const r = detectChord(["E2", "B2"]);
    expect(r.best?.symbol).toBe("E5");
  });
});

describe("detectChord - sevenths and beyond", () => {
  it("detects a dominant 7th", () => {
    const r = detectChord(["G3", "B3", "D4", "F4"]);
    expect(r.best?.symbol).toBe("G7");
  });

  it("detects a maj7", () => {
    const r = detectChord(["C4", "E4", "G4", "B4"]);
    expect(r.best?.symbol).toBe("Cmaj7");
  });

  it("detects sus4", () => {
    const r = detectChord(["D4", "G4", "A4"]);
    expect(r.best?.symbol).toBe("Dsus4");
  });
});

describe("detectChord - slash chords / inversions", () => {
  it("detects a first-inversion C major over E bass", () => {
    const r = detectChord(["E3", "G3", "C4"]);
    expect(r.best?.symbol).toBe("C/E");
    expect(r.best?.isSlash).toBe(true);
  });

  it("detects G/B", () => {
    const r = detectChord(["B2", "D3", "G3"]);
    expect(r.best?.symbol).toBe("G/B");
  });
});

describe("detectChord - incomplete voicings", () => {
  it("does not fail on root+3rd only (no 5th)", () => {
    const r = detectChord(["C4", "E4"]);
    expect(r.best).not.toBeNull();
    expect(r.best?.symbol).toBe("C");
    expect(r.best?.missingNotes).toEqual(["G"]);
  });

  it("does not fail on root+minor3rd only", () => {
    const r = detectChord(["A3", "C4"]);
    expect(r.best?.symbol).toBe("Am");
  });

  it("suggests a dominant 7th reading for root+3rd+b7 (no 5th)", () => {
    const r = detectChord(["G3", "B3", "F4"]);
    expect(r.best?.symbol).toBe("G7");
  });
});

describe("detectChord - ambiguous voicings offer alternatives", () => {
  it("returns alternative interpretations alongside the best guess", () => {
    const r = detectChord(["C4", "E4", "G4"]);
    expect(r.alternatives.length).toBeGreaterThan(0);
  });
});

describe("detectChord - key context re-ranks results", () => {
  it("prefers the diatonic reading when a key context is supplied", () => {
    // C E G A could read as CM(add6)-ish or Am7 (first inversion, C bass).
    // In the key of C major, Am7/C is a very normal borrowed-context read;
    // check that supplying context flags rankedByContext and still returns
    // a sensible diatonic-first answer.
    const withoutContext = detectChord(["C4", "E4", "G4"]);
    const withContext = detectChord(["C4", "E4", "G4"], { tonic: "C", mode: "major" });
    expect(withContext.rankedByContext).toBe(true);
    expect(withoutContext.rankedByContext).toBe(false);
    expect(withContext.best?.symbol).toBe("C");
  });
});
