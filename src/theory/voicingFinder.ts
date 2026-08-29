// Reverse of guitar.ts: given a chord symbol, find playable fret shapes in
// the current tuning/capo. This is a genuine gap (Tonal has no notion of
// guitar fretting), and a hardcoded shape-per-chord table wouldn't work
// for arbitrary custom tunings anyway - so this is a pruned backtracking
// search over actual open-string pitches, which works uniformly for
// standard, alternate (Open G, DADGAD...), and custom tunings.
//
// Performance: pitch-class sets are tracked as a 12-bit mask (not a Set)
// to avoid per-node allocation, and the search starts with a narrow
// (open-position-friendly) fret window, only widening if nothing playable
// turns up there - both matter once chords get to 6-7 tones on 7-8 strings.
import { Chord, Note } from "tonal";
import type { ChordShape, FretValue, Tuning } from "../models/types";

export interface VoicingOptions {
  /** How many frets above the capo to search (0..searchWindow-1). */
  searchWindow?: number;
  /** Reject shapes whose fretted (non-open) notes span more than this many frets. */
  maxFretSpan?: number;
  minSoundingStrings?: number;
  maxResults?: number;
}

const DEFAULTS: Required<VoicingOptions> = {
  searchWindow: 5,
  maxFretSpan: 4,
  minSoundingStrings: 3,
  maxResults: 3,
};

const WIDE_SEARCH_WINDOW = 9;

function fretSpan(frets: FretValue[]): number {
  const fretted = frets.filter((f): f is number => typeof f === "number" && f > 0);
  return fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
}

function popcount(mask: number): number {
  let n = mask, count = 0;
  while (n) {
    n &= n - 1;
    count++;
  }
  return count;
}

function search(
  numStrings: number,
  openMidis: (number | null)[],
  capo: number,
  targetMask: number,
  targetTonesCount: number,
  rootChroma: number,
  bassChroma: number,
  opts: Required<VoicingOptions>,
): { shape: ChordShape; score: number }[] {
  const results: { shape: ChordShape; score: number }[] = [];
  const shape: FretValue[] = new Array(numStrings).fill("x");

  function recurse(stringIndex: number, playedMask: number, soundingCount: number) {
    if (stringIndex === numStrings) {
      if (soundingCount < opts.minSoundingStrings) return;
      if (popcount(playedMask) < targetTonesCount - 1) return; // allow omitting at most one chord tone
      if (fretSpan(shape) > opts.maxFretSpan) return;

      let bassMidi = Infinity;
      let maxFret = 0;
      for (let i = 0; i < numStrings; i++) {
        const f = shape[i];
        if (f === "x") continue;
        const midi = openMidis[i]! + capo + f;
        if (midi < bassMidi) bassMidi = midi;
        if (f > maxFret) maxFret = f;
      }
      const bassMatches = ((bassMidi % 12) + 12) % 12 === bassChroma;

      // Favour fuller, lower-position, open-string-friendly shapes: an
      // idiomatic all-open voicing (the whole point of an open tuning)
      // should win over a technically bass-correct shape that requires
      // fretting a string unnecessarily.
      const score =
        soundingCount * 3 +
        ((playedMask >> rootChroma) & 1 ? 5 : 0) +
        (bassMatches ? 2 : 0) -
        fretSpan(shape) * 1.5 -
        maxFret;

      results.push({ shape: { frets: [...shape] }, score });
      return;
    }

    const stringsRemaining = numStrings - stringIndex - 1;
    const canStillMute = soundingCount + stringsRemaining >= opts.minSoundingStrings;

    const openMidi = openMidis[stringIndex];
    if (openMidi !== null) {
      for (let fret = 0; fret < opts.searchWindow; fret++) {
        const chroma = ((openMidi + capo + fret) % 12 + 12) % 12;
        if (!((targetMask >> chroma) & 1)) continue; // prune: this fret isn't a chord tone
        shape[stringIndex] = fret;
        recurse(stringIndex + 1, playedMask | (1 << chroma), soundingCount + 1);
      }
    }

    if (canStillMute) {
      shape[stringIndex] = "x";
      recurse(stringIndex + 1, playedMask, soundingCount);
    }
  }

  recurse(0, 0, 0);
  return results;
}

/**
 * Find playable voicings of `chordSymbol` in `tuning` with `capo`, ranked
 * fullest/most-in-position first. Returns [] if the chord's tonic can't be
 * parsed or no shape satisfies the constraints.
 */
export function findChordVoicings(
  chordSymbol: string,
  tuning: Tuning,
  capo: number,
  options: VoicingOptions = {},
): ChordShape[] {
  const opts = { ...DEFAULTS, ...options };
  const chord = Chord.get(chordSymbol);
  if (chord.empty || !chord.tonic) return [];

  const chromas = chord.notes.map((n) => Note.chroma(n)).filter((c): c is number => c !== undefined);
  if (chromas.length === 0) return [];
  const targetMask = chromas.reduce((mask, c) => mask | (1 << c), 0);
  const rootChroma = Note.chroma(chord.tonic)!;
  const bassChroma = Note.chroma(chord.bass || chord.tonic)!;

  const openMidis = tuning.strings.map((s) => Note.midi(s));
  const numStrings = openMidis.length;

  let results = search(numStrings, openMidis, capo, targetMask, chromas.length, rootChroma, bassChroma, opts);
  if (results.length === 0 && opts.searchWindow < WIDE_SEARCH_WINDOW) {
    results = search(numStrings, openMidis, capo, targetMask, chromas.length, rootChroma, bassChroma, {
      ...opts,
      searchWindow: WIDE_SEARCH_WINDOW,
    });
  }

  results.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    const key = r.shape.frets.join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.slice(0, opts.maxResults).map((r) => r.shape);
}
