import { describe, it, expect } from "vitest";
import { scaleNotes, diatonicChords, modeCharacteristic } from "./scales";

describe("scaleNotes", () => {
  it("generates C major", () => {
    expect(scaleNotes("C", "major")).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
  });

  it("generates D dorian", () => {
    expect(scaleNotes("D", "dorian")).toEqual(["D", "E", "F", "G", "A", "B", "C"]);
  });

  it("generates A harmonic minor", () => {
    expect(scaleNotes("A", "harmonic minor")).toEqual(["A", "B", "C", "D", "E", "F", "G#"]);
  });
});

describe("diatonicChords", () => {
  it("labels C major diatonic triads with roman numerals", () => {
    const chords = diatonicChords("C", "major");
    expect(chords.map((c) => c.romanNumeral)).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
    expect(chords[0].triad).toBe("C");
    expect(chords[4].seventh).toBe("G7");
  });

  it("labels D dorian diatonic triads (characteristic major IV)", () => {
    const chords = diatonicChords("D", "dorian");
    expect(chords[0].romanNumeral).toBe("i");
    expect(chords[3].romanNumeral).toBe("IV");
    expect(chords[3].triad).toBe("G");
  });
});

describe("modeCharacteristic", () => {
  it("identifies dorian's natural 6th and IV chord", () => {
    const c = modeCharacteristic("D", "dorian");
    expect(c?.note).toBe("6");
    expect(c?.noteName).toBe("B");
    expect(c?.chordName).toBe("G");
  });

  it("identifies mixolydian's b7", () => {
    const c = modeCharacteristic("G", "mixolydian");
    expect(c?.note).toBe("b7");
    expect(c?.noteName).toBe("F");
  });
});
