// "Where can I go next?" - rule-based next-chord suggestions, plus the
// related "keep this note" / "keep this bass note" pedal-tone suggestions
// (spec item 10). Every suggestion traces to a named harmonic technique;
// nothing here is random. Built on harmony.ts's diatonic-chord data
// (from Tonal) plus this app's own relationship rules, since Tonal has no
// notion of "what chord comes next".
import { Chord, Note } from "tonal";
import { diatonicHarmonyForKey, type Mode } from "./harmony";
import { classifyChord } from "./progressionAnalysis";
import { pitchClassFromChroma } from "./notes";

export type AdventureTier = "conventional" | "colourful" | "adventurous" | "what-the-hell";

export const ADVENTURE_TIER_LABEL: Record<AdventureTier, string> = {
  conventional: "Conventional (Safe)",
  colourful: "Colourful",
  adventurous: "Adventurous",
  "what-the-hell": "What the hell?",
};

export type SuggestionTechnique =
  | "diatonic"
  | "secondary-dominant"
  | "tritone-sub"
  | "modal-interchange"
  | "chromatic-mediant"
  | "common-tone"
  | "diminished-passing"
  | "altered-dominant"
  | "parallel-key"
  | "pedal-point"
  | "blues-convention";

export interface ChordSuggestion {
  symbol: string;
  tier: AdventureTier;
  technique: SuggestionTechnique;
  explanation: string;
}

function chroma(pc: string): number {
  return Note.chroma(pc) ?? 0;
}

function sharedToneCount(a: string, b: string): number {
  const notesA = Chord.get(a).notes;
  const notesB = Chord.get(b).notes;
  return notesA.filter((n) => notesB.some((m) => chroma(m) === chroma(n))).length;
}

function rootMotionLabel(fromRoot: string, toRoot: string): string {
  const diff = ((chroma(toRoot) - chroma(fromRoot) + 12) % 12);
  if (diff === 5) return "root moves up a 4th (strong, resolution-like motion)";
  if (diff === 7) return "root moves up a 5th (circle-of-fifths motion)";
  if (diff === 2 || diff === 10) return "stepwise root motion (common in pop/rock)";
  if (diff === 3 || diff === 4 || diff === 8 || diff === 9) return "root motion by a 3rd (shares tones, gentle motion)";
  return "root motion by step or leap";
}

/** Rule-based "where can this progression go next?" suggestions for the
 * given current chord, grouped by adventure tier. */
export function suggestNextChords(currentChord: string, key: { tonic: string; mode: Mode }): ChordSuggestion[] {
  const h = diatonicHarmonyForKey(key.tonic, key.mode);
  const currentRoot = Chord.get(currentChord).tonic ?? currentChord;
  const out: ChordSuggestion[] = [];
  const seen = new Set<string>([currentChord]);
  const add = (symbol: string, tier: AdventureTier, technique: SuggestionTechnique, explanation: string) => {
    if (Chord.get(symbol).empty || seen.has(symbol)) return;
    seen.add(symbol);
    out.push({ symbol, tier, technique, explanation });
  };

  // --- Conventional: diatonic triads/sevenths of the key ---
  h.triads.forEach((triad) => {
    if (chroma(Chord.get(triad).tonic!) === chroma(currentRoot)) return;
    add(triad, "conventional", "diatonic", `Diatonic chord - ${rootMotionLabel(currentRoot, triad)}.`);
  });

  // --- Colourful: secondary dominants, modal interchange, common tones ---
  h.secondaryDominants.forEach((dom, i) => {
    if (!dom) return;
    add(dom, "colourful", "secondary-dominant", `Secondary dominant resolving into ${h.triads[i]} - adds a temporary leading tone.`);
  });
  const parallelMode: Mode = key.mode === "major" ? "minor" : "major";
  const parallelH = diatonicHarmonyForKey(key.tonic, parallelMode);
  // The most idiomatic borrowed chords (the ones that show up constantly
  // in pop/rock) vs. the rest of the parallel mode's triads, which are
  // still traceable modal-interchange relationships but land as a bigger,
  // less familiar shift - split between the colourful and what-the-hell
  // tiers rather than dumping the whole parallel key in one bucket.
  const COMMON_BORROW_ROMAN = new Set(
    key.mode === "major" ? ["iv", "bIII", "bVI", "bVII"] : ["I", "IV", "V"],
  );
  parallelH.triads.forEach((triad) => {
    const analysis = classifyChord(triad, key.tonic, key.mode);
    if (analysis.diatonic) return;
    if (COMMON_BORROW_ROMAN.has(analysis.romanNumeral)) {
      add(triad, "colourful", "modal-interchange", `Borrowed from the parallel ${parallelMode} - ${analysis.romanNumeral} is one of the most common borrowed chords in pop/rock.`);
    }
  });

  // --- Adventurous: tritone subs, chromatic mediants, altered dominants, diminished passing ---
  h.substituteDominants.forEach((sub, i) => {
    if (!sub) return;
    add(sub, "adventurous", "tritone-sub", `Tritone substitute for the dominant of ${h.triads[i]} - same key tritone, root a b5 away, strong chromatic bass motion.`);
  });
  for (let semis = 0; semis < 12; semis++) {
    if (![3, 4, 8, 9].includes(semis)) continue;
    const targetChroma = (chroma(currentRoot) + semis) % 12;
    const targetPc = h.scale.find((n) => chroma(n) === targetChroma) ?? pitchClassFromChroma(targetChroma);
    for (const quality of ["", "m"]) {
      const symbol = `${targetPc}${quality}`;
      if (sharedToneCount(currentChord, symbol) >= 1 && !h.triads.includes(symbol)) {
        add(symbol, "adventurous", "chromatic-mediant", `Chromatic mediant - root a 3rd away, at least one shared tone with ${currentChord}, no diatonic function.`);
      }
    }
  }
  h.secondaryDominants.forEach((dom, i) => {
    if (!dom) return;
    const altered = `${Chord.get(dom).tonic}7b9`;
    add(altered, "adventurous", "altered-dominant", `Altered version of the secondary dominant into ${h.triads[i]} - the b9 sharpens the pull toward resolution.`);
  });
  h.triads.forEach((triad) => {
    const targetChroma = chroma(Chord.get(triad).tonic!);
    const passingChroma = (targetChroma + 11) % 12; // half step below
    const passingPc = pitchClassFromChroma(passingChroma);
    add(`${passingPc}dim7`, "adventurous", "diminished-passing", `Diminished passing chord a half step below ${triad} - resolves up by step into it.`);
  });

  // --- What the hell?: the less-idiomatic corner of the parallel key, pedal point / blues convention ---
  parallelH.triads.forEach((triad) => {
    const analysis = classifyChord(triad, key.tonic, key.mode);
    if (analysis.diatonic || COMMON_BORROW_ROMAN.has(analysis.romanNumeral)) return;
    add(triad, "what-the-hell", "parallel-key", `Borrowed from the parallel ${parallelMode} (${analysis.romanNumeral}) - a rarer, more jarring borrow than the usual bVI/bVII/iv cliches.`);
  });
  add(`${currentRoot}7`, "what-the-hell", "blues-convention", `Static/pedal move - reharmonise the same root as a dominant 7th, blues/rock convention that ignores classical resolution.`);

  return out;
}

/** "Keep this note" - chords that contain or extend a chosen note. */
export function chordsContainingNote(note: string, key: { tonic: string; mode: Mode }): ChordSuggestion[] {
  const h = diatonicHarmonyForKey(key.tonic, key.mode);
  const targetChroma = chroma(note);
  const out: ChordSuggestion[] = [];
  h.sevenths.forEach((symbol) => {
    if (Chord.get(symbol).notes.some((n) => chroma(n) === targetChroma)) {
      out.push({ symbol, tier: "conventional", technique: "common-tone", explanation: `Diatonic chord containing ${note}.` });
    }
  });
  return out;
}

/** "Keep bass note" - slash chords/voicings over a chosen bass note. */
export function slashChordsOverBass(bass: string, key: { tonic: string; mode: Mode }): ChordSuggestion[] {
  const h = diatonicHarmonyForKey(key.tonic, key.mode);
  const out: ChordSuggestion[] = [];
  h.triads.forEach((symbol) => {
    if (Chord.get(symbol).tonic === bass) return;
    const symbolChroma = Chord.get(symbol).notes.map(chroma);
    const isChordTone = symbolChroma.includes(chroma(bass));
    out.push({
      symbol: `${symbol}/${bass}`,
      tier: isChordTone ? "conventional" : "colourful",
      technique: "pedal-point",
      explanation: isChordTone
        ? `${bass} is already a chord tone of ${symbol} - a smooth inversion over the held bass.`
        : `${bass} is not a chord tone of ${symbol} - a pedal-tone dissonance over the held bass, common in rock.`,
    });
  });
  return out;
}
