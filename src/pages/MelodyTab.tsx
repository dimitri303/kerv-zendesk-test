import { useState } from "react";
import { Note } from "tonal";
import type { Project } from "../models/types";
import type { ActiveKey } from "../App";
import { ALL_SCALE_TYPES, scaleNotes } from "../theory/scales";
import { MODE_INFO } from "../theory/modes";
import { scalesForChord, targetNotesForChord, type TargetNoteRole } from "../theory/chords";
import { harmoniseMelody } from "../theory/melodyHarmonisation";
import { allChordSymbols } from "../models/projectOps";

interface Props {
  project: Project;
  activeKey: ActiveKey;
}

const ROLE_LABEL: Record<TargetNoteRole, string> = {
  "chord-tone": "Chord tone",
  "safe-scale": "Safe scale note",
  colour: "Colour tone",
  avoid: "Avoid",
};

export default function MelodyTab({ project, activeKey }: Props) {
  const chordSymbols = allChordSymbols(project);
  const key = { tonic: activeKey.tonic, mode: activeKey.mode };

  const [chordIndex, setChordIndex] = useState(0);
  const selectedChord = chordSymbols[chordIndex] ?? chordSymbols[0];
  const scaleOptions = selectedChord ? scalesForChord(selectedChord, key) : [];
  const [scaleChoice, setScaleChoice] = useState(0);
  const chosen = scaleOptions[scaleChoice] ?? scaleOptions[0];
  const targetNotes = selectedChord && chosen ? targetNotesForChord(selectedChord, chosen.tonic, chosen.type) : [];

  const [melodyInput, setMelodyInput] = useState("E G A G E");
  const melodyNotes = melodyInput.trim().split(/\s+/).filter(Boolean);
  const invalidNotes = melodyNotes.filter((n) => Note.get(n).empty);
  const harmonisation = invalidNotes.length === 0 && melodyNotes.length > 0 ? harmoniseMelody(melodyNotes) : null;

  return (
    <div>
      <h2>Target notes</h2>
      {chordSymbols.length === 0 ? (
        <p className="muted">Add chords to the progression first.</p>
      ) : (
        <>
          <div className="row">
            <label>
              Chord:
              <select value={chordIndex} onChange={(e) => setChordIndex(Number(e.target.value))}>
                {chordSymbols.map((s, i) => <option key={i} value={i}>{s} (#{i + 1})</option>)}
              </select>
            </label>
            <label>
              Scale:
              <select value={scaleChoice} onChange={(e) => setScaleChoice(Number(e.target.value))}>
                {scaleOptions.map((o, i) => <option key={i} value={i}>{o.label}: {o.tonic} {o.type}</option>)}
              </select>
            </label>
          </div>
          <table>
            <thead><tr><th>Note</th><th>Role</th></tr></thead>
            <tbody>
              {targetNotes.map((t, i) => (
                <tr key={i}><td>{t.note}</td><td>{ROLE_LABEL[t.role]}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Melody-first mode</h2>
      <p className="muted">Enter a note sequence (e.g. "E G A G E") to get possible harmonisations.</p>
      <div className="row">
        <input value={melodyInput} onChange={(e) => setMelodyInput(e.target.value)} style={{ width: "16rem" }} />
      </div>
      {invalidNotes.length > 0 && <p className="muted">Not recognised: {invalidNotes.join(", ")}</p>}
      {harmonisation && (
        <>
          {harmonisation.key && (
            <p className="muted">Inferred key: {harmonisation.key.tonic} {harmonisation.key.mode}</p>
          )}
          {(["conventional", "colourful", "unexpected"] as const).map((tier) => (
            <div key={tier}>
              <h3>{tier[0].toUpperCase() + tier.slice(1)}</h3>
              <ul>
                {harmonisation.suggestions.filter((s) => s.tier === tier).map((s, i) => (
                  <li key={i}>{s.symbol} - <span className="muted">{s.explanation}</span></li>
                ))}
                {harmonisation.suggestions.filter((s) => s.tier === tier).length === 0 && <li className="muted">(none)</li>}
              </ul>
            </div>
          ))}
        </>
      )}

      <h2>Scale reference</h2>
      <p className="muted">Notes in {chosen ? `${chosen.tonic} ${chosen.type}` : `${activeKey.tonic} ${activeKey.scaleType}`}: {scaleNotes(chosen?.tonic ?? activeKey.tonic, chosen?.type ?? activeKey.scaleType).join(" ")}</p>
      <p className="muted">All supported modes: {ALL_SCALE_TYPES.map((t) => MODE_INFO[t].label).join(", ")}</p>
    </div>
  );
}
