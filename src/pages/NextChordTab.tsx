import { useState } from "react";
import { Chord } from "tonal";
import type { Project, ExplanationLevel } from "../models/types";
import type { ActiveKey } from "../App";
import {
  suggestNextChords, chordsContainingNote, slashChordsOverBass,
  ADVENTURE_TIER_LABEL, type AdventureTier, type ChordSuggestion,
} from "../theory/suggestions";
import { lastChordSymbol, addChordToLastSection } from "../models/projectOps";
import { explanationFor } from "../models/explanation";

interface Props {
  project: Project;
  setProject: (p: Project) => void;
  activeKey: ActiveKey;
}

const TIER_ORDER: AdventureTier[] = ["conventional", "colourful", "adventurous", "what-the-hell"];
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function SuggestionList({ items, level, onAdd }: { items: ChordSuggestion[]; level: ExplanationLevel; onAdd: (s: string) => void }) {
  if (items.length === 0) return <p className="muted">(none)</p>;
  return (
    <ul>
      {items.map((s, i) => {
        const explanation = explanationFor(level, s.explanation);
        return (
          <li key={`${s.symbol}-${i}`}>
            <button onClick={() => onAdd(s.symbol)}>{s.symbol}</button>{" "}
            <span className="tag">{s.technique}</span>
            {explanation && <div className="muted">{explanation}</div>}
          </li>
        );
      })}
    </ul>
  );
}

export default function NextChordTab({ project, setProject, activeKey }: Props) {
  const defaultChord = lastChordSymbol(project) ?? `${activeKey.tonic}${activeKey.mode === "minor" ? "m" : ""}`;
  const [currentChord, setCurrentChord] = useState(defaultChord);
  const [maxTier, setMaxTier] = useState<AdventureTier>("what-the-hell");
  const [keepNote, setKeepNote] = useState("E");
  const [keepBass, setKeepBass] = useState("C");

  const key = { tonic: activeKey.tonic, mode: activeKey.mode };
  const valid = !Chord.get(currentChord).empty;
  const suggestions = valid ? suggestNextChords(currentChord, key) : [];
  const maxIndex = TIER_ORDER.indexOf(maxTier);

  const addChord = (symbol: string) => setProject(addChordToLastSection(project, symbol));

  const noteChords = chordsContainingNote(keepNote, key);
  const bassChords = slashChordsOverBass(keepBass, key);

  return (
    <div>
      <h2>Where can I go next?</h2>
      <div className="row">
        <label>
          Current chord:
          <input value={currentChord} onChange={(e) => setCurrentChord(e.target.value)} style={{ width: "6rem" }} />
        </label>
        <label>
          Adventure level:
          <select value={maxTier} onChange={(e) => setMaxTier(e.target.value as AdventureTier)}>
            {TIER_ORDER.map((t) => <option key={t} value={t}>{ADVENTURE_TIER_LABEL[t]}</option>)}
          </select>
        </label>
        <span className="muted">Key: {activeKey.tonic} {activeKey.mode}</span>
      </div>
      {!valid && <p className="muted">"{currentChord}" isn't a chord symbol Tonal recognises.</p>}

      {valid && TIER_ORDER.slice(0, maxIndex + 1).map((tier) => (
        <div key={tier}>
          <h3>{ADVENTURE_TIER_LABEL[tier]}</h3>
          <SuggestionList
            items={suggestions.filter((s) => s.tier === tier)}
            level={project.explanationLevel}
            onAdd={addChord}
          />
        </div>
      ))}

      <h2>Keep this note</h2>
      <div className="row">
        <label>
          Note:
          <select value={keepNote} onChange={(e) => setKeepNote(e.target.value)}>
            {NOTE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <SuggestionList items={noteChords} level={project.explanationLevel} onAdd={addChord} />

      <h2>Keep this bass note</h2>
      <div className="row">
        <label>
          Bass note:
          <select value={keepBass} onChange={(e) => setKeepBass(e.target.value)}>
            {NOTE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <SuggestionList items={bassChords} level={project.explanationLevel} onAdd={addChord} />
    </div>
  );
}
