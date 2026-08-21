// "Alter the feel" - deterministic, rule-based progression transformations
// (spec item 11). Entirely bespoke: Tonal has no notion of "make this
// darker." Each transformation inspects every chord's diatonic role via
// progressionAnalysis.classifyChord and applies one clear, explainable
// substitution rule; nothing here is randomised.
import { Chord, Note } from "tonal";
import { classifyChord, type ChordAnalysis } from "./progressionAnalysis";
import type { Mode } from "./harmony";
import { pitchClassFromChroma } from "./notes";

function chroma(pc: string): number {
  return Note.chroma(pc) ?? 0;
}

export type TransformationName =
  | "darker" | "brighter" | "more-tense" | "more-unresolved" | "dreamier"
  | "heavier" | "bluesier" | "more-psychedelic" | "more-sophisticated" | "simpler";

export interface TransformationResult {
  chords: string[];
  reason: string;
}

type ChordTransformer = (symbol: string, analysis: ChordAnalysis, index: number, all: ChordAnalysis[]) => string;

function applyPerChord(
  chordSymbols: string[],
  key: { tonic: string; mode: Mode },
  transform: ChordTransformer,
): string[] {
  const analyses = chordSymbols.map((s, i) => ({ index: i, ...classifyChord(s, key.tonic, key.mode) }));
  return chordSymbols.map((s, i) => transform(s, analyses[i], i, analyses));
}

function rootAndBassSuffix(symbol: string): { root: string; bass: string | null } {
  const chord = Chord.get(symbol);
  return { root: chord.tonic ?? symbol, bass: chord.bass || null };
}

function withBass(root: string, suffix: string, bass: string | null): string {
  return bass && chroma(bass) !== chroma(root) ? `${root}${suffix}/${bass}` : `${root}${suffix}`;
}

export const TRANSFORMATIONS: Record<TransformationName, {
  label: string;
  apply: (chordSymbols: string[], key: { tonic: string; mode: Mode }) => TransformationResult;
}> = {
  darker: {
    label: "Darker",
    apply: (chordSymbols, key) => ({
      chords: applyPerChord(chordSymbols, key, (symbol, analysis) => {
        if (analysis.quality !== "Major") return symbol;
        const { root, bass } = rootAndBassSuffix(symbol);
        return withBass(root, "m", bass);
      }),
      reason: "Diatonic major chords swapped for their parallel-minor equivalents, darkening the tonality.",
    }),
  },
  brighter: {
    label: "Brighter",
    apply: (chordSymbols, key) => ({
      chords: applyPerChord(chordSymbols, key, (symbol, analysis) => {
        if (analysis.quality !== "Minor") return symbol;
        const { root, bass } = rootAndBassSuffix(symbol);
        return withBass(root, "", bass);
      }),
      reason: "Diatonic minor chords swapped for their parallel-major equivalents, brightening the tonality.",
    }),
  },
  "more-tense": {
    label: "More tense",
    apply: (chordSymbols, key) => ({
      chords: applyPerChord(chordSymbols, key, (symbol, analysis) => {
        const { root, bass } = rootAndBassSuffix(symbol);
        if (analysis.romanNumeral === "V" || analysis.category === "secondary-dominant") {
          return withBass(root, "7b9", bass);
        }
        const suffix = analysis.quality === "Major" ? "maj7" : analysis.quality === "Minor" ? "m7" : null;
        return suffix ? withBass(root, suffix, bass) : symbol;
      }),
      reason: "Added sevenths, and sharpened dominants with a b9, to increase harmonic tension.",
    }),
  },
  "more-unresolved": {
    label: "More unresolved",
    apply: (chordSymbols, key) => ({
      chords: applyPerChord(chordSymbols, key, (symbol, analysis, i, all) => {
        if (analysis.romanNumeral !== "I" && analysis.romanNumeral !== "i") return symbol;
        const prev = all[i - 1];
        if (!prev || prev.romanNumeral !== "V") return symbol;
        // Deceptive resolution target: major key's vi (offset 9, minor) or
        // minor key's bVI (offset 8, major).
        const offset = key.mode === "major" ? 9 : 8;
        const targetRoot = pitchClassFromChroma(chroma(key.tonic) + offset);
        return key.mode === "major" ? `${targetRoot}m` : targetRoot;
      }),
      reason: "Replaced V -> I resolutions with a deceptive V -> vi, avoiding full harmonic closure.",
    }),
  },
  dreamier: {
    label: "Dreamier",
    apply: (chordSymbols, key) => ({
      chords: applyPerChord(chordSymbols, key, (symbol, analysis) => {
        const { root, bass } = rootAndBassSuffix(symbol);
        if (analysis.quality === "Major") return withBass(root, "maj9", bass);
        if (analysis.quality === "Minor") return withBass(root, "m9", bass);
        return symbol;
      }),
      reason: "Widened triads into 9th-chord voicings for a softer, hazier wash of colour.",
    }),
  },
  heavier: {
    label: "Heavier",
    apply: (chordSymbols, key) => ({
      chords: applyPerChord(chordSymbols, key, (symbol) => {
        const { root, bass } = rootAndBassSuffix(symbol);
        return withBass(root, "5", bass);
      }),
      reason: "Reduced every chord to a power chord (root + 5th), dropping the 3rd for an ambiguous, heavier tonality.",
    }),
  },
  bluesier: {
    label: "Bluesier",
    apply: (chordSymbols, key) => ({
      chords: applyPerChord(chordSymbols, key, (symbol) => {
        const { root, bass } = rootAndBassSuffix(symbol);
        return withBass(root, "7", bass);
      }),
      reason: "Turned every chord into a dominant 7th - the blues convention of treating each chord as its own dominant sonority.",
    }),
  },
  "more-psychedelic": {
    label: "More psychedelic",
    apply: (chordSymbols, key) => ({
      chords: applyPerChord(chordSymbols, key, (symbol, analysis, i) => {
        if (i % 2 === 0) return symbol;
        const { root, bass } = rootAndBassSuffix(symbol);
        const targetRoot = pitchClassFromChroma(chroma(root) + 4);
        const suffix = analysis.quality === "Minor" ? "m" : "";
        return withBass(targetRoot, suffix, bass);
      }),
      reason: "Substituted alternating chords with a chromatic mediant a major 3rd up, for colour-driven, non-functional movement.",
    }),
  },
  "more-sophisticated": {
    label: "More sophisticated",
    apply: (chordSymbols, key) => ({
      chords: applyPerChord(chordSymbols, key, (symbol, analysis) => {
        const { root, bass } = rootAndBassSuffix(symbol);
        if (analysis.romanNumeral === "V" || analysis.category === "secondary-dominant") return withBass(root, "13", bass);
        if (analysis.quality === "Major") return withBass(root, "maj9", bass);
        if (analysis.quality === "Minor") return withBass(root, "m9", bass);
        return symbol;
      }),
      reason: "Extended each chord to its 9th or 13th, adding jazz-harmony sophistication.",
    }),
  },
  simpler: {
    label: "Simpler",
    apply: (chordSymbols, key) => ({
      chords: applyPerChord(chordSymbols, key, (symbol, analysis) => {
        const { root, bass } = rootAndBassSuffix(symbol);
        const suffix = analysis.quality === "Minor" ? "m" : analysis.quality === "Diminished" ? "dim" : "";
        return withBass(root, suffix, bass);
      }),
      reason: "Stripped every chord back to a plain triad, removing extensions and chromatic substitutions.",
    }),
  },
};
