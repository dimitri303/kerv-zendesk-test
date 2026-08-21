// Key-finding and diatonic-harmony helpers used by progressionAnalysis.ts
// and suggestions.ts. Tonal's Key module gives us fully-formed diatonic
// chords, secondary dominants, and substitute (tritone-sub) dominants for
// a *given* tonic; the genuine gap is figuring out which tonic a
// progression implies in the first place, which is what the
// Krumhansl-Schmuckler-style key finder below does.
import { Chord, Key, Note } from "tonal";

// Krumhansl & Kessler's original tonal hierarchy profiles.
const KS_MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// Conventional key names by chroma (0=C..11=B), one representative
// spelling per pitch class. See ASSUMPTIONS.md. Exported so UI code (the
// key/tonic picker) can offer the same conventional spellings.
export const MAJOR_KEY_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
export const MINOR_KEY_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];

export type Mode = "major" | "minor";

export interface KeyGuess {
  tonic: string;
  mode: Mode;
  correlation: number;
}

export interface KeyFindingResult {
  best: KeyGuess | null;
  alternatives: KeyGuess[];
  ambiguous: boolean;
}

function pitchClassWeights(chordSymbols: string[]): number[] {
  const weights = Array(12).fill(0);
  for (const symbol of chordSymbols) {
    const chord = Chord.get(symbol);
    if (chord.empty || chord.notes.length === 0) continue;
    chord.notes.forEach((note, i) => {
      const chroma = Note.chroma(note);
      if (chroma === undefined) return;
      // Root carries the most weight, then 3rd/5th, extensions lightest -
      // a simple stand-in for "how much this tone defines the sonority",
      // since we have chord symbols rather than note durations to weight by.
      const salience = i === 0 ? 3 : i <= 2 ? 1.5 : 0.75;
      weights[chroma] += salience;
    });
  }
  return weights;
}

function correlate(x: number[], y: number[]): number {
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
}

function rotateProfile(profile: number[], shift: number): number[] {
  return Array.from({ length: 12 }, (_, i) => profile[((i - shift) % 12 + 12) % 12]);
}

function keyGuessesFromWeights(weights: number[]): KeyFindingResult {
  if (weights.every((w) => w === 0)) {
    return { best: null, alternatives: [], ambiguous: true };
  }
  const guesses: KeyGuess[] = [];
  for (let chroma = 0; chroma < 12; chroma++) {
    guesses.push({
      tonic: MAJOR_KEY_NAMES[chroma],
      mode: "major",
      correlation: correlate(weights, rotateProfile(KS_MAJOR_PROFILE, chroma)),
    });
    guesses.push({
      tonic: MINOR_KEY_NAMES[chroma],
      mode: "minor",
      correlation: correlate(weights, rotateProfile(KS_MINOR_PROFILE, chroma)),
    });
  }
  guesses.sort((a, b) => b.correlation - a.correlation);
  const [best, second] = guesses;
  const ambiguous = second !== undefined && best.correlation - second.correlation < 0.03;
  return { best, alternatives: guesses.slice(1, 4), ambiguous };
}

/**
 * Krumhansl-Schmuckler-style key finder: builds a weighted pitch-class
 * histogram from the progression's chord tones, then correlates it
 * against all 24 rotated major/minor tonal-hierarchy profiles. Returns
 * the best match plus close alternatives, flagging ambiguity rather than
 * forcing a single answer when the top candidates are close.
 */
export function findKey(chordSymbols: string[]): KeyFindingResult {
  return keyGuessesFromWeights(pitchClassWeights(chordSymbols));
}

/** Same key-finding approach, but from a raw melody note sequence rather
 * than chord symbols (used by melodyHarmonisation.ts) - every occurrence
 * is weighted equally since we have no note-duration information. */
export function findKeyFromNotes(notes: string[]): KeyFindingResult {
  const weights = Array(12).fill(0);
  for (const note of notes) {
    const c = Note.chroma(note);
    if (c !== undefined) weights[c] += 1;
  }
  return keyGuessesFromWeights(weights);
}

export interface DiatonicHarmonyInfo {
  scale: readonly string[];
  triads: readonly string[];
  sevenths: readonly string[];
  secondaryDominants: readonly string[]; // parallel to scale degrees, "" where none applies
  substituteDominants: readonly string[]; // tritone subs of the secondary dominants
}

/** Diatonic harmony for a key, including secondary dominants and tritone
 * subs, straight from Tonal's Key module (major keys) or its natural-minor
 * form (minor keys) - no reason to recompute what Tonal already gets right. */
export function diatonicHarmonyForKey(tonic: string, mode: Mode): DiatonicHarmonyInfo {
  if (mode === "major") {
    const k = Key.majorKey(tonic);
    return {
      scale: k.scale,
      triads: k.triads,
      sevenths: k.chords,
      secondaryDominants: k.secondaryDominants,
      substituteDominants: k.substituteDominants,
    };
  }
  const k = Key.minorKey(tonic).natural;
  return {
    scale: k.scale,
    triads: k.triads,
    sevenths: k.chords,
    secondaryDominants: k.secondaryDominants,
    substituteDominants: k.substituteDominants,
  };
}
