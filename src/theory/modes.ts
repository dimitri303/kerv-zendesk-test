// Mode metadata for UI display. The actual note/chord generation lives in
// scales.ts (a "mode" is just a scale type in this app's model).
import type { ScaleTypeName } from "../models/types";
import { ALL_SCALE_TYPES } from "./scales";

export interface ModeInfo {
  id: ScaleTypeName;
  label: string;
  parallel: "major" | "minor" | "other";
  blurb: string;
}

export const MODE_INFO: Record<ScaleTypeName, ModeInfo> = {
  major: { id: "major", label: "Major (Ionian)", parallel: "major", blurb: "The reference major scale." },
  dorian: { id: "dorian", label: "Dorian", parallel: "minor", blurb: "Minor with a natural 6th; brighter, jazzy/folky minor." },
  phrygian: { id: "phrygian", label: "Phrygian", parallel: "minor", blurb: "Minor with a b2; dark, Spanish/metal flavour." },
  lydian: { id: "lydian", label: "Lydian", parallel: "major", blurb: "Major with a #4; dreamy, floating quality." },
  mixolydian: { id: "mixolydian", label: "Mixolydian", parallel: "major", blurb: "Major with a b7; bluesy/rock dominant sound." },
  aeolian: { id: "aeolian", label: "Natural Minor (Aeolian)", parallel: "minor", blurb: "The reference natural minor scale." },
  locrian: { id: "locrian", label: "Locrian", parallel: "minor", blurb: "Minor with b2 and b5; unstable, rarely a true tonic." },
  "harmonic minor": { id: "harmonic minor", label: "Harmonic Minor", parallel: "minor", blurb: "Natural minor with a raised 7th for a strong dominant." },
  "melodic minor": { id: "melodic minor", label: "Melodic Minor", parallel: "minor", blurb: "Natural minor with raised 6th and 7th." },
};

export const MODE_LIST: ModeInfo[] = ALL_SCALE_TYPES.map((t) => MODE_INFO[t]);
