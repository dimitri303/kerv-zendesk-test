// Tuning + capo + fret -> sounding pitch. This is the one genuinely
// guitar-specific calculation Tonal has no notion of; everything below the
// per-string midi arithmetic hands straight back to Tonal for note naming.
import { Note } from "tonal";
import type { ChordShape, FretValue, Tuning } from "../models/types";

export interface SoundingNote {
  stringIndex: number; // 0 = lowest string
  fret: FretValue;
  midi: number | null; // null when muted
  note: string | null; // null when muted, otherwise a spelled note name e.g. "A3"
}

/**
 * Given an open-string tuning, a capo position, and a fret per string,
 * compute the sounding pitch of each string. Muted strings ("x") produce
 * no sounding note.
 *
 * Fret numbers are entered relative to the capo, matching how guitarists
 * actually think about a shape played with a capo on: "fret 0" means
 * "don't finger this string, let it ring at the capo", and each fret
 * above that is counted from the capo, not from the nut. So the true
 * distance from the nut is `capo + fret`. E.g. standard tuning, capo 2,
 * open-G shape (3 2 0 0 0 3) sounds as A major, a whole step up from G.
 */
export function soundingNotes(tuning: Tuning, capo: number, shape: ChordShape): SoundingNote[] {
  return shape.frets.map((fret, stringIndex) => {
    const openNote = tuning.strings[stringIndex];
    if (fret === "x" || openNote === undefined) {
      return { stringIndex, fret, midi: null, note: null };
    }
    const openMidi = Note.midi(openNote);
    if (openMidi === null) {
      return { stringIndex, fret, midi: null, note: null };
    }
    const midi = openMidi + capo + fret;
    return { stringIndex, fret, midi, note: Note.fromMidi(midi) };
  });
}

/** Sounding note names only (no octave), skipping muted strings, low to high. */
export function soundingPitchClasses(tuning: Tuning, capo: number, shape: ChordShape): string[] {
  return soundingNotes(tuning, capo, shape)
    .filter((s): s is SoundingNote & { note: string } => s.note !== null)
    .map((s) => Note.get(s.note).pc);
}

/** The lowest-sounding note (the bass note), or null if everything is muted. */
export function bassNote(tuning: Tuning, capo: number, shape: ChordShape): SoundingNote | null {
  const notes = soundingNotes(tuning, capo, shape).filter((s) => s.midi !== null);
  if (notes.length === 0) return null;
  return notes.reduce((lowest, s) => (s.midi! < lowest.midi! ? s : lowest));
}

export function emptyShape(stringCount: number): ChordShape {
  return { frets: Array(stringCount).fill("x") };
}
