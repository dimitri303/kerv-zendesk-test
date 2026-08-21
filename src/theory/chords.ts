// Scale-over-chord and target-note recommendations for soloing/melody
// writing (spec item 8). This is the one place chord data (Tonal) and
// scale data (scales.ts) meet to answer "what can I play over this?" -
// genuinely new glue code, since neither Tonal nor scales.ts knows about
// "which of these notes are safe vs. an avoid tone."
import { Chord, Note } from "tonal";
import type { ScaleTypeName } from "../models/types";
import { ALL_SCALE_TYPES, scaleNotes, modeCharacteristic } from "./scales";
import { MAJOR_OFFSETS, MINOR_OFFSETS } from "./progressionAnalysis";
import type { Mode } from "./harmony";

function chroma(pc: string): number {
  return Note.chroma(pc) ?? 0;
}

type Family = "major" | "minor" | "dominant" | "diminished" | "other";

function familyFor(symbol: string): Family {
  const chord = Chord.get(symbol);
  if (/dominant/.test(chord.type)) return "dominant";
  if (chord.quality === "Major") return "major";
  if (chord.quality === "Minor") return "minor";
  if (chord.quality === "Diminished") return "diminished";
  return "other";
}

const PREFERENCE_BY_FAMILY: Record<Family, ScaleTypeName[]> = {
  major: ["major", "lydian", "mixolydian"],
  minor: ["aeolian", "dorian", "phrygian", "harmonic minor", "melodic minor"],
  dominant: ["mixolydian", "major", "harmonic minor", "melodic minor"],
  diminished: ["locrian"],
  other: ALL_SCALE_TYPES,
};

// Degree order for each parent-key mode, aligned index-for-index with
// MAJOR_OFFSETS / MINOR_OFFSETS from progressionAnalysis.ts.
const DIATONIC_MODE_MAJOR: ScaleTypeName[] = ["major", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian"];
const DIATONIC_MODE_MINOR: ScaleTypeName[] = ["aeolian", "locrian", "major", "dorian", "phrygian", "lydian", "mixolydian"];

function modeAtDegree(key: { tonic: string; mode: Mode }, root: string): ScaleTypeName | null {
  const offsets = key.mode === "major" ? MAJOR_OFFSETS : MINOR_OFFSETS;
  const modes = key.mode === "major" ? DIATONIC_MODE_MAJOR : DIATONIC_MODE_MINOR;
  const offset = (chroma(root) - chroma(key.tonic) + 12) % 12;
  const idx = offsets.indexOf(offset);
  return idx === -1 ? null : modes[idx];
}

export interface ScaleOption {
  tonic: string;
  type: ScaleTypeName;
  label: "safest" | "strong" | "colour";
  explanation: string;
}

/** Scale options for a single chord: safest (matches its diatonic
 * function when a key is given), a strong alternative, and a colour
 * option, all guaranteed to contain every note of the chord. */
export function scalesForChord(symbol: string, key?: { tonic: string; mode: Mode }): ScaleOption[] {
  const chord = Chord.get(symbol);
  if (chord.empty || !chord.tonic) return [];
  const root = chord.tonic;
  const chordChromas = chord.notes.map(chroma);

  const candidates = ALL_SCALE_TYPES.filter((type) => {
    const scaleChromas = new Set(scaleNotes(root, type).map(chroma));
    return chordChromas.every((c) => scaleChromas.has(c));
  });
  if (candidates.length === 0) return [];

  const family = familyFor(symbol);
  const preferenceOrder = PREFERENCE_BY_FAMILY[family].filter((t) => candidates.includes(t));
  const ordered = [...preferenceOrder, ...candidates.filter((t) => !preferenceOrder.includes(t))];

  const parentKeyMode = key ? modeAtDegree(key, root) : null;
  const safest = parentKeyMode && candidates.includes(parentKeyMode) ? parentKeyMode : ordered[0];
  const rest = ordered.filter((t) => t !== safest);
  const strong = rest[0] ?? safest;
  const colour = rest.find((t) => t !== strong) ?? strong;

  const describe = (type: ScaleTypeName, label: ScaleOption["label"]): ScaleOption => ({
    tonic: root,
    type,
    label,
    explanation:
      label === "safest"
        ? `${root} ${type} covers every note of ${symbol} cleanly - the safe default.`
        : label === "strong"
          ? `${root} ${type} also fits ${symbol} fully, with a slightly different flavour.`
          : `${root} ${type} fits ${symbol} but leans into a more distinctive colour tone.`,
  });

  const results = [describe(safest, "safest")];
  if (strong !== safest) results.push(describe(strong, "strong"));
  if (colour !== strong && colour !== safest) results.push(describe(colour, "colour"));
  return results;
}

/** Scale options for a whole progression at once. */
export function scalesForProgression(chordSymbols: string[], key: { tonic: string; mode: Mode }): ScaleOption[] {
  const safestType: ScaleTypeName = key.mode === "major" ? "major" : "aeolian";
  const usedChromas = new Set(chordSymbols.flatMap((s) => Chord.get(s).notes.map(chroma)));

  const results: ScaleOption[] = [{
    tonic: key.tonic,
    type: safestType,
    label: "safest",
    explanation: `${key.tonic} ${safestType} is the key's own scale and underpins the progression's diatonic harmony.`,
  }];

  const strongCandidate = ALL_SCALE_TYPES.find((type) => {
    if (type === safestType) return false;
    const scaleChromas = new Set(scaleNotes(key.tonic, type).map(chroma));
    return [...usedChromas].every((c) => scaleChromas.has(c));
  });
  if (strongCandidate) {
    results.push({
      tonic: key.tonic,
      type: strongCandidate,
      label: "strong",
      explanation: `${key.tonic} ${strongCandidate} also contains every note used across the whole progression.`,
    });
  }

  const parallelType: ScaleTypeName = key.mode === "major" ? "aeolian" : "major";
  const parallelName = key.mode === "major" ? "minor" : "major";
  results.push({
    tonic: key.tonic,
    type: parallelType,
    label: "colour",
    explanation: `Borrowing the parallel ${parallelName}'s scale adds colour, especially useful if the progression uses any borrowed chords.`,
  });
  return results;
}

export type TargetNoteRole = "chord-tone" | "safe-scale" | "colour" | "avoid";

export interface TargetNote {
  note: string;
  role: TargetNoteRole;
}

/**
 * Target notes for soloing/melody over one chord within a given scale:
 * chord tones, safe scale notes, the scale's colour/characteristic tone,
 * and avoid tones (scale notes a half step above a chord tone - the one
 * broadly-agreed-on practical rule, kept deliberately simple rather than
 * academic).
 */
export function targetNotesForChord(chordSymbol: string, scaleTonic: string, scaleType: ScaleTypeName): TargetNote[] {
  const chord = Chord.get(chordSymbol);
  const chordChromas = chord.notes.map(chroma);
  const scale = scaleNotes(scaleTonic, scaleType);
  const characteristic = modeCharacteristic(scaleTonic, scaleType);
  const characteristicChroma = characteristic ? chroma(characteristic.noteName) : null;

  return scale.map((note): TargetNote => {
    const c = chroma(note);
    if (chordChromas.includes(c)) return { note, role: "chord-tone" };
    const clashesWithChordTone = chordChromas.some((ct) => (c - ct + 12) % 12 === 1);
    if (clashesWithChordTone) return { note, role: "avoid" };
    if (characteristicChroma !== null && c === characteristicChroma) return { note, role: "colour" };
    return { note, role: "safe-scale" };
  });
}
