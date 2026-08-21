// Chord recognition from a set of sounding notes. Tonal's own Chord.detect
// is used where it already does the job well (clean, complete voicings),
// but it returns nothing for incomplete voicings (e.g. root+3rd with no
// 5th, or root+7th with no 3rd) and it has no notion of "how likely is
// this reading, given no other context" or "how likely, given this key".
// Guitarists routinely play incomplete/ambiguous voicings, so this module
// re-implements detection directly against Tonal's ChordType dictionary,
// which *does* correctly enumerate every chord's interval/chroma pattern
// (triads through 13ths, add/sus/dim/half-dim/aug/altered) - we only add
// the subset-matching and ranking Tonal doesn't provide.
import { ChordType, Note } from "tonal";
import { spellInKey, pitchClassFromChroma } from "./notes";

export interface KeyContext {
  tonic: string;
  mode: "major" | "minor";
}

export interface ChordMatch {
  symbol: string;
  root: string;
  bass: string;
  notes: string[]; // full theoretical chord tones (pitch classes), spelled
  missingNotes: string[]; // theoretical chord tones not actually played
  quality: string;
  typeName: string;
  isSlash: boolean;
  score: number;
}

export interface ChordDetectionResult {
  pitchClasses: string[];
  bass: string | null;
  best: ChordMatch | null;
  alternatives: ChordMatch[];
  rankedByContext: boolean;
}

const CHORD_TYPES = ChordType.all();

// Suffix aliases Tonal picks by default aren't always the most readable
// ("Madd9" instead of "add9"); override a handful of common ones by their
// chroma fingerprint, which is a stable, collision-free key.
function overrideSuffix(alias: string, suffix: string): [string, string] {
  return [ChordType.get(alias).chroma, suffix];
}
const SUFFIX_OVERRIDES = new Map<string, string>([
  overrideSuffix("add9", "add9"),
  overrideSuffix("m9", "m9"),
  overrideSuffix("maj9", "maj9"),
  overrideSuffix("9", "9"),
  overrideSuffix("11", "11"),
  overrideSuffix("13", "13"),
  overrideSuffix("m11", "m11"),
  overrideSuffix("m13", "m13"),
]);

function pickSuffix(type: (typeof CHORD_TYPES)[number]): string {
  const override = SUFFIX_OVERRIDES.get(type.chroma);
  if (override !== undefined) return override;
  if (type.aliases.includes("")) return "";
  const clean = type.aliases.filter((a) => /^[A-Za-z0-9#b]+$/.test(a));
  return clean[0] ?? type.aliases[0] ?? type.name;
}

// Roughly how commonly each chord family shows up in guitar-based popular
// music, used only as a tie-break per the spec's default ranking heuristic
// ("prefer more common chord qualities over rarer ones, e.g. m7 over
// add(b6)"). Lower = more common. Anything not listed defaults to 9.
const COMMONNESS_ORDER = [
  "M", "m", "5",
  "7", "m7", "maj7",
  "sus4", "sus2", "6", "m6",
  "dim", "m7b5", "aug",
  "9", "m9", "maj9", "add9",
  "dim7", "7sus4",
  "11", "13", "m11", "m13",
];
const COMMONNESS_RANK = new Map<string, number>();
CHORD_TYPES.forEach((t) => {
  const idx = COMMONNESS_ORDER.findIndex((alias) => ChordType.get(alias).chroma === t.chroma);
  // Tonal's dictionary includes explicit "omit a note" entries (e.g.
  // "7no5"). These are just guitarist-style omissions of a common chord,
  // not genuinely distinct chords, so they should never outrank reading
  // the same notes as an incomplete voicing of the common chord (handled
  // via subset matching below) - push them well below the common list.
  const isExplicitOmission = t.aliases.some((a) => /no\d/.test(a));
  COMMONNESS_RANK.set(t.chroma, isExplicitOmission ? 20 : idx === -1 ? 9 : idx);
});

function chromaRelativeToRoot(pcs: string[], root: string): string {
  const rootChroma = Note.chroma(root);
  if (rootChroma === undefined) return "000000000000";
  const bits = Array(12).fill(0);
  for (const pc of pcs) {
    const c = Note.chroma(pc);
    if (c === undefined) continue;
    bits[(c - rootChroma + 12) % 12] = 1;
  }
  return bits.join("");
}

function isSubsetChroma(sub: string, sup: string): boolean {
  for (let i = 0; i < 12; i++) {
    if (sub[i] === "1" && sup[i] !== "1") return false;
  }
  return true;
}

function countBits(chroma: string): number {
  return chroma.split("").filter((b) => b === "1").length;
}

function chromaToPitchClasses(chroma: string, root: string): string[] {
  const rootChroma = Note.chroma(root) ?? 0;
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    if (chroma[i] === "1") {
      out.push(spellFromChroma((rootChroma + i) % 12, root));
    }
  }
  return out;
}

function spellFromChroma(chroma: number, referenceRoot: string): string {
  // Spell relative to the reference root's own accidental bias so chord
  // tones read naturally (sharp roots get sharp extensions, flat roots
  // get flat extensions) without mixing within one chord.
  const preferFlats = /b$/.test(referenceRoot) && !/#/.test(referenceRoot);
  return pitchClassFromChroma(chroma, preferFlats);
}

function isDiatonicMatch(root: string, context: KeyContext): boolean {
  // Cheap fit check: is this root a member of the key's scale? We don't
  // need exact diatonic-chord-symbol equality here - just "does this
  // reading make harmonic sense in context" - full
  // diatonic/borrowed classification happens in progressionAnalysis.ts.
  const keyChroma = context.mode === "major"
    ? [0, 2, 4, 5, 7, 9, 11]
    : [0, 2, 3, 5, 7, 8, 10];
  const tonicChroma = Note.chroma(context.tonic) ?? 0;
  const rootChroma = Note.chroma(root) ?? 0;
  const degreeOffset = (rootChroma - tonicChroma + 12) % 12;
  return keyChroma.includes(degreeOffset);
}

function buildMatch(
  root: string,
  type: (typeof CHORD_TYPES)[number],
  playedChroma: string,
  bass: string,
  context?: KeyContext,
): ChordMatch {
  const suffix = pickSuffix(type);
  const isSlash = Note.chroma(bass) !== Note.chroma(root);
  const symbol = isSlash ? `${root}${suffix}/${bass}` : `${root}${suffix}`;
  const theoreticalNotes = chromaToPitchClasses(type.chroma, root);
  const missing: string[] = [];
  for (let i = 0; i < 12; i++) {
    if (type.chroma[i] === "1" && playedChroma[i] !== "1") {
      missing.push(spellFromChroma((Note.chroma(root)! + i) % 12, root));
    }
  }
  const missingCount = missing.length;
  let score = missingCount * 10 + (COMMONNESS_RANK.get(type.chroma) ?? 9);
  if (isSlash) score += 0.5;
  if (context) {
    score += isDiatonicMatch(root, context) ? -50 : 0;
  }
  return {
    symbol,
    root,
    bass,
    notes: theoreticalNotes,
    missingNotes: missing,
    quality: type.quality,
    typeName: type.name || suffix,
    isSlash,
    score,
  };
}

export function detectChord(
  playedNotes: string[],
  context?: KeyContext,
): ChordDetectionResult {
  const withMidi = playedNotes.map((n) => ({ name: n, midi: Note.midi(n) }));
  const pitchClasses = Array.from(new Set(playedNotes.map((n) => Note.get(n).pc || n)));

  if (pitchClasses.length === 0) {
    return { pitchClasses: [], bass: null, best: null, alternatives: [], rankedByContext: false };
  }

  let bass: string;
  if (withMidi.every((n) => n.midi !== null)) {
    bass = Note.get(withMidi.reduce((a, b) => (b.midi! < a.midi! ? b : a)).name).pc;
  } else {
    bass = pitchClasses[0];
  }

  const matches: ChordMatch[] = [];
  for (const root of pitchClasses) {
    const chroma = chromaRelativeToRoot(pitchClasses, root);
    for (const type of CHORD_TYPES) {
      if (type.chroma === chroma) {
        matches.push(buildMatch(root, type, chroma, bass, context));
      } else if (isSubsetChroma(chroma, type.chroma)) {
        const missingCount = countBits(type.chroma) - countBits(chroma);
        // A single note can't meaningfully imply a chord; cap how many
        // notes we're willing to assume were left unplayed.
        if (missingCount >= 1 && missingCount <= 2 && countBits(chroma) >= 2) {
          matches.push(buildMatch(root, type, chroma, bass, context));
        }
      }
    }
  }

  matches.sort((a, b) => a.score - b.score || (a.root === bass ? -1 : 1) - (b.root === bass ? -1 : 1));

  // De-duplicate by symbol (the same type can be reached via exact + a
  // near-identical subset match in edge cases).
  const seen = new Set<string>();
  const deduped = matches.filter((m) => {
    if (seen.has(m.symbol)) return false;
    seen.add(m.symbol);
    return true;
  });

  const [best, ...alternatives] = deduped;
  return {
    pitchClasses,
    bass,
    best: best ?? null,
    alternatives: alternatives.slice(0, 6),
    rankedByContext: !!context,
  };
}

/** Respell a detected match's root/bass to fit a key context (item #14). */
export function spellMatchInKey(match: ChordMatch, context: KeyContext): ChordMatch {
  const root = spellInKey(match.root, context.tonic, context.mode);
  const bass = spellInKey(match.bass, context.tonic, context.mode);
  const suffix = match.symbol.includes("/") ? match.symbol.split("/")[0].slice(match.root.length) : match.symbol.slice(match.root.length);
  const symbol = match.isSlash ? `${root}${suffix}/${bass}` : `${root}${suffix}`;
  return { ...match, root, bass, symbol };
}
