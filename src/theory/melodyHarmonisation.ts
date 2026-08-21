// Melody-first mode (spec item 9): given a note sequence, suggest chords
// that could harmonise it, grouped Conventional / Colourful / Unexpected.
// Deliberately simple for v1, as the spec asks - one set of "what could
// sit under this whole phrase" suggestions rather than a full per-note
// reharmonisation engine.
import { Chord, Note } from "tonal";
import { findKeyFromNotes, diatonicHarmonyForKey, type Mode } from "./harmony";

function chroma(pc: string): number {
  return Note.chroma(pc) ?? 0;
}

export type HarmonisationTier = "conventional" | "colourful" | "unexpected";

export interface MelodyHarmonisation {
  symbol: string;
  tier: HarmonisationTier;
  coverage: number; // fraction of melody notes that are chord tones
  explanation: string;
}

export interface MelodyHarmonisationResult {
  key: { tonic: string; mode: Mode } | null;
  keyInferred: boolean;
  suggestions: MelodyHarmonisation[];
}

function coverageFor(symbol: string, melodyChromas: number[]): number {
  const chordChromas = new Set(Chord.get(symbol).notes.map(chroma));
  const hits = melodyChromas.filter((c) => chordChromas.has(c)).length;
  return melodyChromas.length === 0 ? 0 : hits / melodyChromas.length;
}

export function harmoniseMelody(
  melodyNotes: string[],
  keyOverride?: { tonic: string; mode: Mode },
): MelodyHarmonisationResult {
  if (melodyNotes.length === 0) return { key: null, keyInferred: false, suggestions: [] };

  const guess = findKeyFromNotes(melodyNotes);
  const key = keyOverride ?? (guess.best ? { tonic: guess.best.tonic, mode: guess.best.mode } : null);
  if (!key) return { key: null, keyInferred: false, suggestions: [] };

  const melodyChromas = melodyNotes.map(chroma);
  const h = diatonicHarmonyForKey(key.tonic, key.mode);

  const conventional = h.triads
    .map((symbol) => ({ symbol, coverage: coverageFor(symbol, melodyChromas) }))
    .filter((c) => c.coverage > 0)
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 3)
    .map(({ symbol, coverage }): MelodyHarmonisation => ({
      symbol, tier: "conventional", coverage,
      explanation: `Diatonic chord covering ${Math.round(coverage * 100)}% of the melody's notes as chord tones.`,
    }));

  const colourful: MelodyHarmonisation[] = h.secondaryDominants
    .filter((s): s is string => !!s)
    .map((symbol) => ({ symbol, coverage: coverageFor(symbol, melodyChromas) }))
    .filter((c) => c.coverage > 0)
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 2)
    .map(({ symbol, coverage }) => ({
      symbol, tier: "colourful" as const, coverage,
      explanation: `Secondary dominant that still covers ${Math.round(coverage * 100)}% of the melody's notes.`,
    }));

  const parallelMode: Mode = key.mode === "major" ? "minor" : "major";
  const parallelH = diatonicHarmonyForKey(key.tonic, parallelMode);
  const unexpected: MelodyHarmonisation[] = parallelH.triads
    .filter((symbol) => !h.triads.includes(symbol))
    .map((symbol) => ({ symbol, coverage: coverageFor(symbol, melodyChromas) }))
    .filter((c) => c.coverage > 0)
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 2)
    .map(({ symbol, coverage }) => ({
      symbol, tier: "unexpected" as const, coverage,
      explanation: `Borrowed from the parallel ${parallelMode} - still shares ${Math.round(coverage * 100)}% of the melody's notes.`,
    }));

  return {
    key,
    keyInferred: !keyOverride,
    suggestions: [...conventional, ...colourful, ...unexpected],
  };
}
