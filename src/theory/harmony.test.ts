import { describe, it, expect } from "vitest";
import { findKey, diatonicHarmonyForKey } from "./harmony";

describe("findKey", () => {
  it("identifies C major from a I-IV-V-vi progression", () => {
    const r = findKey(["C", "F", "G", "Am"]);
    expect(r.best?.tonic).toBe("C");
    expect(r.best?.mode).toBe("major");
  });

  it("identifies A minor from a i-iv-v progression", () => {
    const r = findKey(["Am", "Dm", "E7"]);
    expect(r.best?.tonic).toBe("A");
    expect(r.best?.mode).toBe("minor");
  });

  it("identifies G major from a bluesy I-IV-I-V progression", () => {
    const r = findKey(["G", "C", "G", "D7"]);
    expect(r.best?.tonic).toBe("G");
    expect(r.best?.mode).toBe("major");
  });

  it("returns no result for an empty progression", () => {
    const r = findKey([]);
    expect(r.best).toBeNull();
  });
});

describe("diatonicHarmonyForKey", () => {
  it("gives C major's diatonic triads and secondary dominants", () => {
    const h = diatonicHarmonyForKey("C", "major");
    expect(h.triads).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    expect(h.secondaryDominants[1]).toBe("A7"); // V7/ii
  });
});
