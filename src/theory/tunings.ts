// Guitar tuning presets. This is app-specific data, not something Tonal
// provides — Tonal only supplies the note-name math used elsewhere.
import type { Tuning } from "../models/types";

export const BUILT_IN_TUNINGS: Tuning[] = [
  { id: "standard-6", name: "Standard", strings: ["E2", "A2", "D3", "G3", "B3", "E4"], builtIn: true },
  { id: "drop-d-6", name: "Drop D", strings: ["D2", "A2", "D3", "G3", "B3", "E4"], builtIn: true },
  { id: "dadgad-6", name: "DADGAD", strings: ["D2", "A2", "D3", "G3", "A3", "D4"], builtIn: true },
  { id: "open-g-6", name: "Open G", strings: ["D2", "G2", "D3", "G3", "B3", "D4"], builtIn: true },
  { id: "open-d-6", name: "Open D", strings: ["D2", "A2", "D3", "F#3", "A3", "D4"], builtIn: true },
  { id: "standard-7", name: "Standard (7-string)", strings: ["B1", "E2", "A2", "D3", "G3", "B3", "E4"], builtIn: true },
  { id: "standard-8", name: "Standard (8-string)", strings: ["F#1", "B1", "E2", "A2", "D3", "G3", "B3", "E4"], builtIn: true },
];

export function tuningsForStringCount(count: number): Tuning[] {
  return BUILT_IN_TUNINGS.filter((t) => t.strings.length === count);
}

export function makeCustomTuning(name: string, strings: string[]): Tuning {
  return {
    id: `custom-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    name,
    strings,
    builtIn: false,
  };
}
