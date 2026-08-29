import type { ChordShape, Tuning } from "../models/types";
import { soundingNotes } from "../theory/guitar";

interface Props {
  shape: ChordShape;
  tuning: Tuning;
  capo: number;
}

/** Plain string/fret/sounding-note table for one chord shape - the same
 * layout the Guitar tab uses for manually-entered shapes, reused here for
 * shapes the voicing finder proposes. */
export default function ChordChart({ shape, tuning, capo }: Props) {
  const sounding = soundingNotes(tuning, capo, shape);
  return (
    <table style={{ maxWidth: "30rem" }}>
      <tbody>
        <tr>
          <th>String</th>
          {tuning.strings.map((s, i) => <td key={i}>{s}</td>)}
        </tr>
        <tr>
          <th>Fret</th>
          {shape.frets.map((f, i) => <td key={i}>{f}</td>)}
        </tr>
        <tr>
          <th>Sounds as</th>
          {sounding.map((n, i) => <td key={i}>{n.note ?? "-"}</td>)}
        </tr>
      </tbody>
    </table>
  );
}
