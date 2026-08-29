import { useState } from "react";
import type { Tuning } from "../models/types";
import { findChordVoicings } from "../theory/voicingFinder";
import ChordChart from "./ChordChart";

interface Props {
  symbol: string;
  tuning: Tuning;
  capo: number;
}

/** "How do I play this?" - a click-to-expand set of fret charts for a
 * chord symbol in the project's current tuning/capo. Voicings are only
 * computed when expanded, since the search can take tens of ms for rich
 * chords on 7-8 string tunings and this often appears many times at once
 * (progression chips, next-chord suggestion lists). */
export default function ChordVoicings({ symbol, tuning, capo }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [voicings, setVoicings] = useState<ReturnType<typeof findChordVoicings> | null>(null);

  const toggle = () => {
    if (!expanded && voicings === null) {
      setVoicings(findChordVoicings(symbol, tuning, capo));
    }
    setExpanded((e) => !e);
  };

  return (
    <span>
      <button onClick={toggle} title={`How to play ${symbol} in ${tuning.name} tuning`} style={{ padding: "0 0.3rem" }}>
        {expanded ? "hide chart" : "chart"}
      </button>
      {expanded && (
        voicings && voicings.length > 0 ? (
          <div className="row" style={{ alignItems: "flex-start" }}>
            {voicings.map((v, i) => <ChordChart key={i} shape={v} tuning={tuning} capo={capo} />)}
          </div>
        ) : (
          <p className="muted">No comfortable voicing found for {symbol} in {tuning.name} tuning.</p>
        )
      )}
    </span>
  );
}
