// Full progression analysis: key guess, roman numerals, borrowed chords,
// secondary dominants, chromatic mediants, diminished passing chords,
// common tones and simple voice-leading notes, unresolved dominants and
// deceptive resolutions. Built on top of harmony.ts (key-finding +
// Tonal's diatonic-chord data) - this module's own job is classifying
// *why* a given chord in a real progression sits where it does.
import { Chord, Note } from "tonal";
import { findKey, diatonicHarmonyForKey, type Mode, type KeyFindingResult } from "./harmony";
import { romanNumeralFromOffset } from "./romanNumerals";

// Semitone offsets (from the tonic) of each diatonic degree, in scale
// order. Exported for reuse by chords.ts, which needs "what diatonic
// degree/mode does this root correspond to" for scale-choice purposes.
export const MAJOR_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_QUALITIES = ["Major", "Minor", "Minor", "Major", "Major", "Minor", "Diminished"];
export const MINOR_OFFSETS = [0, 2, 3, 5, 7, 8, 10];
const MINOR_QUALITIES = ["Minor", "Diminished", "Major", "Minor", "Minor", "Major", "Major"];

export type ChordCategory =
  | "diatonic"
  | "secondary-dominant"
  | "tritone-sub"
  | "modal-interchange"
  | "chromatic-mediant"
  | "diminished-passing"
  | "non-diatonic";

export interface ChordAnalysis {
  index: number;
  symbol: string;
  root: string;
  bass: string;
  isSlash: boolean;
  quality: string;
  romanNumeral: string;
  diatonic: boolean;
  category: ChordCategory;
  explanation: string;
}

export interface ChordPairInfo {
  fromIndex: number;
  toIndex: number;
  commonTones: string[];
  bassMotionSemitones: number;
  stepwiseVoices: { note: string; toNote: string; semitones: number }[];
  deceptiveResolution: boolean;
  dominantResolvesConventionally: boolean | null; // null = "from" chord isn't dominant-functioning
}

export interface ProgressionAnalysisResult {
  key: KeyFindingResult;
  usedKey: { tonic: string; mode: Mode } | null;
  chords: ChordAnalysis[];
  pairs: ChordPairInfo[];
}

function offsetOf(rootPc: string, tonicPc: string): number {
  return ((Note.chroma(rootPc)! - Note.chroma(tonicPc)! + 12) % 12);
}

/** Classify a single chord symbol's function within a key. Exported for
 * reuse by suggestions.ts, which needs to know the current chord's roman
 * numeral/category before proposing what comes next. */
export function classifyChord(symbol: string, tonic: string, mode: Mode): Omit<ChordAnalysis, "index"> {
  const chord = Chord.get(symbol);
  const root = chord.tonic ?? symbol;
  const bass = chord.bass || root;
  const quality = chord.quality;
  const offset = offsetOf(root, tonic);
  const romanNumeral = romanNumeralFromOffset(offset, quality);

  const ownOffsets = mode === "major" ? MAJOR_OFFSETS : MINOR_OFFSETS;
  const ownQualities = mode === "major" ? MAJOR_QUALITIES : MINOR_QUALITIES;
  const ownDegree = ownOffsets.indexOf(offset);
  if (ownDegree !== -1 && ownQualities[ownDegree] === quality) {
    return {
      symbol, root, bass, isSlash: !!chord.bass, quality, romanNumeral, diatonic: true,
      category: "diatonic",
      explanation: `Diatonic ${romanNumeral} chord in ${tonic} ${mode}.`,
    };
  }

  const h = diatonicHarmonyForKey(tonic, mode);
  const isDominantType = /dominant/.test(chord.type) || (quality === "Major" && chord.name.includes("seventh"));

  if (isDominantType) {
    const secIdx = h.secondaryDominants.findIndex((s) => s && offsetOf(Chord.get(s).tonic!, tonic) === offset);
    if (secIdx !== -1) {
      const targetRoman = romanNumeralFromOffset(ownOffsets[secIdx], ownQualities[secIdx]);
      return {
        symbol, root, bass, isSlash: !!chord.bass, quality, romanNumeral, diatonic: false,
        category: "secondary-dominant",
        explanation: `Secondary dominant - V7 of ${targetRoman}, borrowing the leading tone that resolves down a 5th into it.`,
      };
    }
    const subIdx = h.substituteDominants.findIndex((s) => s && offsetOf(Chord.get(s).tonic!, tonic) === offset);
    if (subIdx !== -1) {
      const targetRoman = romanNumeralFromOffset(ownOffsets[subIdx], ownQualities[subIdx]);
      return {
        symbol, root, bass, isSlash: !!chord.bass, quality, romanNumeral, diatonic: false,
        category: "tritone-sub",
        explanation: `Tritone substitution for the dominant of ${targetRoman} - shares the same tritone (3rd/7th), root a tritone away.`,
      };
    }
  }

  const otherOffsets = mode === "major" ? MINOR_OFFSETS : MAJOR_OFFSETS;
  const otherQualities = mode === "major" ? MINOR_QUALITIES : MAJOR_QUALITIES;
  const otherDegree = otherOffsets.indexOf(offset);
  if (otherDegree !== -1 && otherQualities[otherDegree] === quality) {
    const otherModeName = mode === "major" ? "parallel minor" : "parallel major";
    return {
      symbol, root, bass, isSlash: !!chord.bass, quality, romanNumeral, diatonic: false,
      category: "modal-interchange",
      explanation: `Borrowed from the ${otherModeName} (modal interchange) - ${romanNumeral} isn't diatonic to ${tonic} ${mode} but is diatonic to its ${otherModeName}.`,
    };
  }

  if (quality === "Diminished") {
    return {
      symbol, root, bass, isSlash: !!chord.bass, quality, romanNumeral, diatonic: false,
      category: "diminished-passing",
      explanation: `Diminished chord outside the key - likely a passing/secondary leading-tone chord resolving up by a half step.`,
    };
  }

  if ((quality === "Major" || quality === "Minor") && [3, 4, 8, 9].includes(offset)) {
    return {
      symbol, root, bass, isSlash: !!chord.bass, quality, romanNumeral, diatonic: false,
      category: "chromatic-mediant",
      explanation: `Chromatic mediant - root a 3rd from the tonic, sharing one common tone, without a diatonic or secondary-dominant relationship.`,
    };
  }

  return {
    symbol, root, bass, isSlash: !!chord.bass, quality, romanNumeral, diatonic: false,
    category: "non-diatonic",
    explanation: `Non-diatonic to ${tonic} ${mode}. Not a mistake - common in rock/blues/modal writing.`,
  };
}

function pairInfo(a: string, b: string, fromIndex: number, toIndex: number, fromAnalysis: ChordAnalysis): ChordPairInfo {
  const chordA = Chord.get(a);
  const chordB = Chord.get(b);
  const notesA = chordA.notes;
  const notesB = chordB.notes;
  const commonTones = notesA.filter((n) => notesB.some((m) => Note.chroma(m) === Note.chroma(n)));

  const stepwiseVoices: ChordPairInfo["stepwiseVoices"] = [];
  for (const n of notesA) {
    if (commonTones.some((c) => Note.chroma(c) === Note.chroma(n))) continue;
    let nearest: { note: string; dist: number } | null = null;
    for (const m of notesB) {
      const diff = ((Note.chroma(m)! - Note.chroma(n)! + 18) % 12) - 6; // shortest signed distance
      const dist = Math.abs(diff);
      if (nearest === null || dist < nearest.dist) nearest = { note: m, dist };
    }
    if (nearest && nearest.dist <= 2) {
      stepwiseVoices.push({ note: n, toNote: nearest.note, semitones: nearest.dist });
    }
  }

  const bassA = chordA.bass || chordA.tonic!;
  const bassB = chordB.bass || chordB.tonic!;
  const bassMotionSemitones = ((Note.chroma(bassB)! - Note.chroma(bassA)! + 18) % 12) - 6;

  const isDominantFunction = fromAnalysis.category === "diatonic" && fromAnalysis.romanNumeral === "V"
    || fromAnalysis.category === "secondary-dominant";
  const expectedTarget = isDominantFunction ? (Note.chroma(chordA.tonic!)! + 5) % 12 : null;
  const actualTargetRoot = Note.chroma(chordB.tonic!)!;
  const dominantResolvesConventionally = isDominantFunction ? expectedTarget === actualTargetRoot : null;

  const deceptiveResolution = isDominantFunction && fromAnalysis.romanNumeral === "V"
    && chordB.quality === "Minor"
    && ((actualTargetRoot - Note.chroma(chordA.tonic!)! + 12) % 12) === 2; // V -> vi/VI, up a major 2nd

  return { fromIndex, toIndex, commonTones, bassMotionSemitones, stepwiseVoices, deceptiveResolution, dominantResolvesConventionally };
}

export function analyzeProgression(
  chordSymbols: string[],
  keyOverride?: { tonic: string; mode: Mode },
): ProgressionAnalysisResult {
  if (chordSymbols.length === 0) {
    return { key: { best: null, alternatives: [], ambiguous: true }, usedKey: null, chords: [], pairs: [] };
  }
  const key = findKey(chordSymbols);
  const usedKey = keyOverride ?? (key.best ? { tonic: key.best.tonic, mode: key.best.mode } : null);
  if (!usedKey) {
    return { key, usedKey: null, chords: [], pairs: [] };
  }

  const chords: ChordAnalysis[] = chordSymbols.map((symbol, index) => ({
    index,
    ...classifyChord(symbol, usedKey.tonic, usedKey.mode),
  }));

  const pairs: ChordPairInfo[] = [];
  for (let i = 0; i < chordSymbols.length - 1; i++) {
    pairs.push(pairInfo(chordSymbols[i], chordSymbols[i + 1], i, i + 1, chords[i]));
  }

  return { key, usedKey, chords, pairs };
}
