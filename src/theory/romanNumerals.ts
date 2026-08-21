// Shared roman-numeral spelling, used by both diatonic scale-degree
// labelling (scales.ts) and chromatic/borrowed-chord labelling
// (harmony.ts, progressionAnalysis.ts).
//
// Convention (documented in ASSUMPTIONS.md): every roman numeral is
// spelled relative to the MAJOR scale of the tonic, regardless of whether
// the key itself is major or minor. This is the common rock/pop/jazz
// convention (e.g. a natural-minor key's diatonic chords read i, ii°,
// bIII, iv, v, bVI, bVII) and it gives one unambiguous system that also
// covers borrowed chords and secondary dominants cleanly.
const OFFSET_ROMAN = ["I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"];

export function romanNumeralFromOffset(semitoneOffsetFromTonic: number, quality: string): string {
  const base = OFFSET_ROMAN[((semitoneOffsetFromTonic % 12) + 12) % 12];
  const isMinorish = quality === "Minor" || quality === "Diminished";
  const numeral = isMinorish ? base.toLowerCase() : base;
  return quality === "Diminished" ? `${numeral}°` : numeral;
}
