// Basic pitch-class voice leading: common tones, semitone/whole-tone
// movement, bass movement, and inversion suggestions that smooth the bass
// line (spec item 13 - explicitly not full orchestral voice leading).
// progressionAnalysis.ts already computes common tones/stepwise motion
// for its own per-pair display; this module adds the one thing it
// doesn't: proposing an inversion (e.g. C -> G/B instead of C -> G) when
// it measurably smooths the bass line.
import { Chord, Note } from "tonal";

function chroma(pc: string): number {
  return Note.chroma(pc) ?? 0;
}

/** Shortest signed distance in semitones from a to b, in (-6, 6]. */
function shortestDistance(a: string, b: string): number {
  return (((chroma(b) - chroma(a) + 18) % 12) - 6);
}

export interface InversionSuggestion {
  symbol: string; // e.g. "G/B"
  bass: string;
  bassMotionSemitones: number;
}

export interface VoiceLeadingResult {
  commonTones: string[];
  bassMotionSemitones: number;
  stepwiseVoices: { note: string; toNote: string; semitones: number }[];
  suggestedInversion: InversionSuggestion | null;
}

/**
 * Analyse the move from one chord to the next, and - if some inversion of
 * the second chord would meaningfully smooth the bass line versus its
 * root position - suggest it.
 */
export function voiceLeadingBetween(fromSymbol: string, toSymbol: string): VoiceLeadingResult {
  const fromChord = Chord.get(fromSymbol);
  const toChord = Chord.get(toSymbol);
  const fromBass = fromChord.bass || fromChord.tonic!;
  const toRootBass = toChord.bass || toChord.tonic!;

  const commonTones = fromChord.notes.filter((n) => toChord.notes.some((m) => chroma(m) === chroma(n)));

  const stepwiseVoices: VoiceLeadingResult["stepwiseVoices"] = [];
  for (const n of fromChord.notes) {
    if (commonTones.some((c) => chroma(c) === chroma(n))) continue;
    let nearest: { note: string; dist: number } | null = null;
    for (const m of toChord.notes) {
      const dist = Math.abs(shortestDistance(n, m));
      if (nearest === null || dist < nearest.dist) nearest = { note: m, dist };
    }
    if (nearest && nearest.dist <= 2) stepwiseVoices.push({ note: n, toNote: nearest.note, semitones: nearest.dist });
  }

  const rootMotion = Math.abs(shortestDistance(fromBass, toRootBass));

  let bestBass = toRootBass;
  let bestMotion = rootMotion;
  for (const candidate of toChord.notes) {
    if (chroma(candidate) === chroma(toRootBass)) continue;
    const motion = Math.abs(shortestDistance(fromBass, candidate));
    if (motion < bestMotion) {
      bestBass = candidate;
      bestMotion = motion;
    }
  }

  const suggestedInversion =
    bestBass !== toRootBass && bestMotion <= 2 && rootMotion - bestMotion >= 2
      ? { symbol: `${toChord.tonic}${symbolSuffix(toChord)}/${bestBass}`, bass: bestBass, bassMotionSemitones: bestMotion }
      : null;

  return {
    commonTones,
    bassMotionSemitones: Math.abs(shortestDistance(fromBass, toRootBass)),
    stepwiseVoices,
    suggestedInversion,
  };
}

function symbolSuffix(chord: ReturnType<typeof Chord.get>): string {
  // chord.symbol is the canonical "RootSuffix" form Tonal parsed from the
  // input; strip the tonic prefix to recover just the quality suffix.
  return chord.tonic ? chord.symbol.slice(chord.tonic.length) : "";
}
