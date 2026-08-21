import { describe, it, expect } from "vitest";
import { spellInKey, midiToNote } from "./notes";

describe("spellInKey", () => {
  it("uses the key's own diatonic spelling", () => {
    expect(spellInKey("Bb", "F", "major")).toBe("Bb");
    expect(spellInKey("F#", "G", "major")).toBe("F#");
  });

  it("keeps chromatic notes consistent with a flat key's bias", () => {
    // Db is not diatonic to F major; F major is a flat key, so a chromatic
    // note between C and D should spell as Db, not C#.
    expect(spellInKey("C#", "F", "major")).toBe("Db");
  });

  it("keeps chromatic notes consistent with a sharp key's bias", () => {
    expect(spellInKey("Db", "D", "major")).toBe("C#");
  });
});

describe("midiToNote", () => {
  it("defaults to sharp spelling", () => {
    expect(midiToNote(61)).toBe("C#4");
  });
  it("can prefer flats", () => {
    expect(midiToNote(61, true)).toBe("Db4");
  });
});
