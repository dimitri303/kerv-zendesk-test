import { useState } from "react";
import type { Project } from "../models/types";
import type { ActiveKey } from "../App";
import { ALL_SCALE_TYPES, scaleNotes, diatonicChords, modeCharacteristic } from "../theory/scales";
import { MODE_INFO } from "../theory/modes";
import { MAJOR_KEY_NAMES } from "../theory/harmony";
import { scalesForProgression, scalesForChord } from "../theory/chords";
import { allChordSymbols } from "../models/projectOps";

interface Props {
  project: Project;
  activeKey: ActiveKey;
}

export default function ScalesTab({ project, activeKey }: Props) {
  const [tonic, setTonic] = useState(activeKey.tonic);
  const [scaleType, setScaleType] = useState(activeKey.scaleType);

  const notes = scaleNotes(tonic, scaleType);
  const chords = diatonicChords(tonic, scaleType);
  const characteristic = modeCharacteristic(tonic, scaleType);

  const chordSymbols = allChordSymbols(project);
  const key = { tonic: activeKey.tonic, mode: activeKey.mode };
  const progressionScales = chordSymbols.length ? scalesForProgression(chordSymbols, key) : [];

  return (
    <div>
      <h2>Key / scale / mode explorer</h2>
      <div className="row">
        <label>
          Tonic:
          <select value={tonic} onChange={(e) => setTonic(e.target.value)}>
            {MAJOR_KEY_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>
          Mode:
          <select value={scaleType} onChange={(e) => setScaleType(e.target.value as typeof scaleType)}>
            {ALL_SCALE_TYPES.map((t) => <option key={t} value={t}>{MODE_INFO[t].label}</option>)}
          </select>
        </label>
      </div>
      <p>Notes: {notes.join(" ")}</p>
      {characteristic && (
        <p className="muted">
          Characteristic: {characteristic.note} ({characteristic.noteName}), giving the {characteristic.chordDegree} chord ({characteristic.chordName}). {characteristic.description}
        </p>
      )}

      <table>
        <thead>
          <tr><th>Degree</th><th>Roman numeral</th><th>Root</th><th>Triad</th><th>7th chord</th></tr>
        </thead>
        <tbody>
          {chords.map((c) => (
            <tr key={c.degree}>
              <td>{c.degree}</td>
              <td>{c.romanNumeral}</td>
              <td>{c.root}</td>
              <td>{c.triad}</td>
              <td>{c.seventh}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Scale options for the current progression</h2>
      {progressionScales.length === 0 && <p className="muted">Add chords to the progression first.</p>}
      <ul>
        {progressionScales.map((s, i) => (
          <li key={i}><strong>{s.label}:</strong> {s.tonic} {s.type} - <span className="muted">{s.explanation}</span></li>
        ))}
      </ul>

      <h2>Scale options per chord</h2>
      <table>
        <thead>
          <tr><th>Chord</th><th>Safest</th><th>Strong</th><th>Colour</th></tr>
        </thead>
        <tbody>
          {chordSymbols.map((symbol, i) => {
            const options = scalesForChord(symbol, key);
            const byLabel = Object.fromEntries(options.map((o) => [o.label, o]));
            return (
              <tr key={i}>
                <td>{symbol}</td>
                <td>{byLabel.safest ? `${byLabel.safest.tonic} ${byLabel.safest.type}` : "-"}</td>
                <td>{byLabel.strong ? `${byLabel.strong.tonic} ${byLabel.strong.type}` : "-"}</td>
                <td>{byLabel.colour ? `${byLabel.colour.tonic} ${byLabel.colour.type}` : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
