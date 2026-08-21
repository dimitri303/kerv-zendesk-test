// Thin wrapper around Tonal's Interval module.
import { Interval } from "tonal";

export function intervalBetween(from: string, to: string): string {
  return Interval.distance(from, to);
}

export function semitones(interval: string): number {
  return Interval.semitones(interval) ?? 0;
}

/** Short human label for an interval, e.g. "3m" -> "minor 3rd". */
export function intervalLabel(interval: string): string {
  const data = Interval.get(interval);
  if (data.empty) return interval;
  const qualityNames: Record<string, string> = {
    P: "perfect",
    M: "major",
    m: "minor",
    A: "augmented",
    d: "diminished",
  };
  const q = qualityNames[data.q] ?? data.q;
  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  return `${q} ${ordinal(data.num)}`;
}
