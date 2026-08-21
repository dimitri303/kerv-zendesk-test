import { describe, it, expect } from "vitest";
import { TRANSFORMATIONS } from "./transformations";

const key = { tonic: "C", mode: "major" as const };
const progression = ["C", "F", "G", "C"];

describe("transformations - determinism", () => {
  it("produces identical output across repeated calls (no randomness)", () => {
    const a = TRANSFORMATIONS.darker.apply(progression, key);
    const b = TRANSFORMATIONS.darker.apply(progression, key);
    expect(a).toEqual(b);
  });
});

describe("darker", () => {
  it("swaps major diatonic chords for their parallel minor", () => {
    const r = TRANSFORMATIONS.darker.apply(progression, key);
    expect(r.chords).toEqual(["Cm", "Fm", "Gm", "Cm"]);
    expect(r.reason.length).toBeGreaterThan(0);
  });
});

describe("brighter", () => {
  it("swaps minor diatonic chords for their parallel major", () => {
    const r = TRANSFORMATIONS.brighter.apply(["Am", "Dm", "Em"], key);
    expect(r.chords).toEqual(["A", "D", "E"]);
  });
});

describe("heavier", () => {
  it("reduces every chord to a power chord", () => {
    const r = TRANSFORMATIONS.heavier.apply(["Cmaj7", "Am7", "G7"], key);
    expect(r.chords).toEqual(["C5", "A5", "G5"]);
  });
});

describe("bluesier", () => {
  it("turns every chord into a dominant 7th", () => {
    const r = TRANSFORMATIONS.bluesier.apply(["C", "F", "G"], key);
    expect(r.chords).toEqual(["C7", "F7", "G7"]);
  });
});

describe("simpler", () => {
  it("strips extensions back to plain triads", () => {
    const r = TRANSFORMATIONS.simpler.apply(["Cmaj7", "Dm9", "G13"], key);
    expect(r.chords).toEqual(["C", "Dm", "G"]);
  });
});

describe("more-unresolved", () => {
  it("replaces a V -> I resolution with a deceptive V -> vi", () => {
    const r = TRANSFORMATIONS["more-unresolved"].apply(["F", "G", "C"], key);
    expect(r.chords[2]).toBe("Am");
  });

  it("leaves a I that isn't preceded by V untouched", () => {
    const r = TRANSFORMATIONS["more-unresolved"].apply(["C", "F", "G"], key);
    expect(r.chords[0]).toBe("C");
  });
});
