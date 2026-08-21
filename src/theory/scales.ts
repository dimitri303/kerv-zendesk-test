// Scale/mode note + diatonic-chord helpers built on top of Tonal's Scale
// and Chord modules. Tonal knows scale formulas; it doesn't label "the ii
// chord of D dorian is Em7", so that stacking is the one bit of glue code
// here.

import { Scale, Chord } from "tonal";
import type { ScaleTypeName } from "../models/types";
import { romanNumeralFromOffset } from "./romanNumerals";

/** Map our app-level scale/mode names onto Tonal scale-type names. */
export const SCALE_TYPE_TONAL_NAME: Record<ScaleTypeName, string> = {
  major: "major",
  aeolian: "aeolian",
  dorian: "dorian",
  phrygian: "phrygian",
  lydian: "lydian",
  mixolydian: "mixolydian",
  locrian: "locrian",
  "harmonic minor": "harmonic minor",
  "melodic minor": "melodic minor",
};

export const ALL_SCALE_TYPES: ScaleTypeName[] = [
  "major",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "aeolian",
  "locrian",
  "harmonic minor",
  "melodic minor",
];

export function scaleNotes(tonic: string, type: ScaleTypeName): string[] {
  return Scale.get(`${tonic} ${SCALE_TYPE_TONAL_NAME[type]}`).notes;
}

export interface DiatonicChord {
  degree: number; // 1-7
  root: string;
  triad: string;
  seventh: string;
  romanNumeral: string;
}

/** Roman numeral shape (case + accidental) for a scale degree, derived by
 * comparing this scale's interval to a step to the parallel major scale. */
// Static semitone table for the handful of diatonic-ish interval shorthands
// that occur across the nine supported scale types.
const INTERVAL_SEMITONES: Record<string, number> = {
  "1P": 0, "2m": 1, "2M": 2, "3m": 3, "3M": 4, "4P": 5, "4A": 6,
  "5d": 6, "5P": 7, "6m": 8, "6M": 9, "7m": 10, "7M": 11,
};

function romanNumeralForDegree(_degreeIndex: number, chordQuality: string, intervalFromTonic: string): string {
  const offset = INTERVAL_SEMITONES[intervalFromTonic] ?? 0;
  const quality = Chord.get(chordQuality).quality;
  return romanNumeralFromOffset(offset, quality);
}

// Tonal's own Chord.detect names a plain major triad "CM"; every other
// quality it returns (m, maj7, 7, dim, m7b5...) is already the
// conventional plain-text symbol, so only this one case needs cleanup.
function stripBareMajorSuffix(symbol: string): string {
  return /^[A-G][#b]?M$/.test(symbol) ? symbol.slice(0, -1) : symbol;
}

/** Diatonic triads and 7th chords for a tonic + scale type, in scale order. */
export function diatonicChords(tonic: string, type: ScaleTypeName): DiatonicChord[] {
  const tonalName = SCALE_TYPE_TONAL_NAME[type];
  const scaleData = Scale.get(`${tonic} ${tonalName}`);
  const notes = scaleData.notes;
  const intervals = scaleData.intervals;
  const result: DiatonicChord[] = [];
  for (let i = 0; i < notes.length; i++) {
    const triadNotes = [0, 2, 4].map((o) => notes[(i + o) % notes.length]);
    const seventhNotes = [0, 2, 4, 6].map((o) => notes[(i + o) % notes.length]);
    const triad = stripBareMajorSuffix(Chord.detect(triadNotes, { assumePerfectFifth: true })[0] ?? "?");
    const seventh = Chord.detect(seventhNotes, { assumePerfectFifth: true })[0] ?? "?";
    result.push({
      degree: i + 1,
      root: notes[i],
      triad,
      seventh,
      romanNumeral: romanNumeralForDegree(i, triad, intervals[i]),
    });
  }
  return result;
}

/** The note/chord that most distinguishes a mode from its parallel major
 * or minor, as called out in the spec (Dorian's nat.6, Mixolydian's b7,
 * Lydian's #4, Phrygian's b2, etc). This is app-specific framing, not
 * something Tonal expresses directly. */
export interface ModeCharacteristic {
  note: string; // scale-degree label, e.g. "6" or "#4"
  noteName: string;
  chordDegree: string; // roman numeral of the characteristic chord
  chordName: string;
  description: string;
}

export function modeCharacteristic(tonic: string, type: ScaleTypeName): ModeCharacteristic | null {
  const chords = diatonicChords(tonic, type);
  const notes = scaleNotes(tonic, type);
  switch (type) {
    case "dorian":
      return {
        note: "6",
        noteName: notes[5],
        chordDegree: chords[3].romanNumeral,
        chordName: chords[3].triad,
        description: "Natural 6th (vs. b6 in natural minor) brightens the iv chord into a major IV.",
      };
    case "mixolydian":
      return {
        note: "b7",
        noteName: notes[6],
        chordDegree: chords[6].romanNumeral,
        chordName: chords[6].triad,
        description: "Flat 7th (vs. major scale) gives a major bVII instead of a leading-tone vii°.",
      };
    case "lydian":
      return {
        note: "#4",
        noteName: notes[3],
        chordDegree: chords[1].romanNumeral,
        chordName: chords[1].triad,
        description: "Sharp 4th replaces the perfect 4th, turning ii into a major II chord.",
      };
    case "phrygian":
      return {
        note: "b2",
        noteName: notes[1],
        chordDegree: chords[1].romanNumeral,
        chordName: chords[1].triad,
        description: "Flat 2nd (vs. natural minor) gives a major bII chord just above the tonic.",
      };
    case "locrian":
      return {
        note: "b5",
        noteName: notes[4],
        chordDegree: chords[0].romanNumeral,
        chordName: chords[0].triad,
        description: "Flat 5th makes even the tonic triad diminished; there is no stable tonic chord.",
      };
    case "harmonic minor":
      return {
        note: "7",
        noteName: notes[6],
        chordDegree: chords[4].romanNumeral,
        chordName: chords[4].triad,
        description: "Raised 7th (vs. natural minor) turns v into a major V, restoring a strong dominant.",
      };
    case "melodic minor":
      return {
        note: "6",
        noteName: notes[5],
        chordDegree: chords[3].romanNumeral,
        chordName: chords[3].triad,
        description: "Raised 6th and 7th (vs. natural minor) turn IV into a major IV alongside a major V.",
      };
    default:
      return null;
  }
}
