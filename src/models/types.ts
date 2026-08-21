// Core data model for the songwriting assistant.
// schemaVersion is bumped whenever this shape changes in a way that could
// break previously saved projects (see storage/projects.ts for migration).

export type FretValue = number | "x"; // 0-24, or "x" for muted string

export interface Tuning {
  id: string; // stable id, e.g. "standard-6", or a generated id for custom tunings
  name: string;
  /** Open string pitches, LOW string first (e.g. ["E2","A2","D3","G3","B3","E4"]) */
  strings: string[];
  builtIn: boolean;
}

export interface ChordShape {
  /** One entry per string, low to high, matching the active tuning's string count */
  frets: FretValue[];
}

export interface ProgressionChord {
  id: string;
  /** Chord symbol, e.g. "Am7", "G/B", "C" */
  symbol: string;
  /** Optional guitar shape that produced/accompanies this chord */
  shape?: ChordShape;
  /** Optional free-text note about this chord */
  note?: string;
}

export interface Section {
  id: string;
  name: string; // "Intro" | "Verse" | ... | custom
  chords: ProgressionChord[];
}

export type ScaleTypeName =
  | "major"
  | "aeolian"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "locrian"
  | "harmonic minor"
  | "melodic minor";

export interface KeyCentre {
  tonic: string; // e.g. "C", "F#"
  mode: ScaleTypeName;
}

export type ExplanationLevel = "off" | "simple" | "theory";

export type ChordDisplayPreference = "sounding" | "shape" | "both";

export interface Project {
  schemaVersion: 1;
  id: string;
  name: string;
  tuning: Tuning;
  numStrings: number;
  capo: number; // 0-12
  key?: KeyCentre;
  sections: Section[];
  customTunings: Tuning[];
  notes: string;
  explanationLevel: ExplanationLevel;
  chordDisplayPreference: ChordDisplayPreference;
  createdAt: string;
  updatedAt: string;
}
