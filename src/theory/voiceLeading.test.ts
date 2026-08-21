import { describe, it, expect } from "vitest";
import { voiceLeadingBetween } from "./voiceLeading";

describe("voiceLeadingBetween", () => {
  it("finds the common tone between C and Am", () => {
    const r = voiceLeadingBetween("C", "Am");
    expect(new Set(r.commonTones)).toEqual(new Set(["C", "E"]));
  });

  it("suggests G/B instead of G after C, to smooth the bass line", () => {
    const r = voiceLeadingBetween("C", "G");
    expect(r.suggestedInversion?.symbol).toBe("G/B");
    expect(r.suggestedInversion?.bass).toBe("B");
  });

  it("does not suggest an inversion when root position is already smooth", () => {
    const r = voiceLeadingBetween("C", "Dm");
    expect(r.suggestedInversion).toBeNull();
  });

  it("reports stepwise voice motion for C -> F", () => {
    const r = voiceLeadingBetween("C", "F");
    // C(C,E,G) -> F(F,A,C): C common; E->F (half step), G->A (whole step)
    const byNote = Object.fromEntries(r.stepwiseVoices.map((v) => [v.note, v.semitones]));
    expect(byNote["E"]).toBe(1);
    expect(byNote["G"]).toBe(2);
  });
});
