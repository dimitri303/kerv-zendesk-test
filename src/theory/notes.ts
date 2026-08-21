// Thin wrappers around Tonal's Note module, plus the one genuine gap:
// context-sensitive enharmonic spelling (Tonal always normalises to one
// spelling; it doesn't know "we're in the key of F so call this note Bb").

import { Note, Key, Midi } from "tonal";

export function isValidNote(name: string): boolean {
  return !Note.get(name).empty;
}

/** Pitch class only, no octave, canonical Tonal spelling (e.g. "Db"). */
export function pitchClass(name: string): string {
  return Note.get(name).pc;
}

export function midiToNote(midi: number, preferFlats = false): string {
  return Midi.midiToNoteName(midi, { sharps: !preferFlats });
}

export function noteMidi(name: string): number | null {
  return Note.midi(name);
}

/** Chroma (0-11) for a note name or bare pitch class. */
export function noteChroma(name: string): number {
  return Note.chroma(name) ?? 0;
}

const SHARP_KEYS = new Set(["G", "D", "A", "E", "B", "F#", "C#"]);
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]);

/**
 * Pick a sensible spelling for `pc` (a pitch class or note name) given a
 * tonal centre. If the pitch class is diatonic to the key, use the key's
 * own spelling. Otherwise fall back to the key's general sharp/flat bias
 * so accidentals don't clash with the rest of the key (e.g. don't mix F#
 * and Gb within the same key context).
 */
export function spellInKey(
  pc: string,
  tonic: string,
  mode: "major" | "minor" = "major",
): string {
  const chroma = noteChroma(pc);
  const keyData = mode === "major" ? Key.majorKey(tonic) : Key.minorKey(tonic).natural;
  const scale = keyData.scale;
  const diatonic = scale.find((n) => noteChroma(n) === chroma);
  if (diatonic) return diatonic;

  const preferFlats = FLAT_KEYS.has(tonic) && !SHARP_KEYS.has(tonic);
  return Midi.midiToNoteName(60 + chroma, { sharps: !preferFlats, pitchClass: true });
}

export function transposeNote(name: string, interval: string): string {
  return Note.transpose(name, interval);
}

const SHARP_PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_PITCH_CLASSES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** Bare pitch-class name (no octave) for a chroma value 0-11. */
export function pitchClassFromChroma(chroma: number, preferFlats = false): string {
  const n = ((chroma % 12) + 12) % 12;
  return preferFlats ? FLAT_PITCH_CLASSES[n] : SHARP_PITCH_CLASSES[n];
}
