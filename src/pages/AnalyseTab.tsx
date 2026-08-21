import { useState } from "react";
import type { Project, ExplanationLevel } from "../models/types";
import type { ActiveKey } from "../App";
import type { KeyFindingResult } from "../theory/harmony";
import { analyzeProgression } from "../theory/progressionAnalysis";
import { voiceLeadingBetween } from "../theory/voiceLeading";
import { TRANSFORMATIONS, type TransformationName } from "../theory/transformations";
import { allChordSymbols, applyTransformedSymbols } from "../models/projectOps";
import { explanationFor } from "../models/explanation";

interface Props {
  project: Project;
  setProject: (p: Project) => void;
  activeKey: ActiveKey;
  keyGuess: KeyFindingResult;
}

export default function AnalyseTab({ project, setProject, activeKey, keyGuess }: Props) {
  const chordSymbols = allChordSymbols(project);
  const analysis = analyzeProgression(chordSymbols, { tonic: activeKey.tonic, mode: activeKey.mode });
  const [preview, setPreview] = useState<{ name: TransformationName; chords: string[]; reason: string } | null>(null);

  const level = project.explanationLevel;
  const setLevel = (l: ExplanationLevel) => setProject({ ...project, explanationLevel: l });

  const runTransformation = (name: TransformationName) => {
    const result = TRANSFORMATIONS[name].apply(chordSymbols, { tonic: activeKey.tonic, mode: activeKey.mode });
    setPreview({ name, chords: result.chords, reason: result.reason });
  };
  const applyPreview = () => {
    if (!preview) return;
    setProject(applyTransformedSymbols(project, preview.chords));
    setPreview(null);
  };

  if (chordSymbols.length === 0) {
    return <p className="muted">Add some chords to the progression first.</p>;
  }

  return (
    <div>
      <h2>Key &amp; progression analysis</h2>
      <div className="row">
        <span>Key: <strong>{activeKey.tonic} {activeKey.mode}</strong>{activeKey.inferred ? " (inferred)" : ""}</span>
        {keyGuess.ambiguous && <span className="muted">Ambiguous - close alternatives exist.</span>}
        <label>
          Explanation:
          <select value={level} onChange={(e) => setLevel(e.target.value as ExplanationLevel)}>
            <option value="off">Off</option>
            <option value="simple">Simple</option>
            <option value="theory">Theory</option>
          </select>
        </label>
      </div>
      {keyGuess.alternatives.length > 0 && (
        <p className="muted">Also considered: {keyGuess.alternatives.slice(0, 3).map((a) => `${a.tonic} ${a.mode}`).join(", ")}</p>
      )}

      <table>
        <thead>
          <tr><th>#</th><th>Chord</th><th>Roman numeral</th><th>Category</th>{level !== "off" && <th>Explanation</th>}</tr>
        </thead>
        <tbody>
          {analysis.chords.map((c) => (
            <tr key={c.index}>
              <td>{c.index + 1}</td>
              <td>{c.symbol}</td>
              <td>{c.romanNumeral}</td>
              <td>{c.category}</td>
              {level !== "off" && <td>{explanationFor(level, c.explanation)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Between chords</h3>
      <table>
        <thead>
          <tr><th>Move</th><th>Common tones</th><th>Bass motion</th><th>Voice leading</th><th>Notes</th></tr>
        </thead>
        <tbody>
          {analysis.pairs.map((p) => {
            const vl = voiceLeadingBetween(chordSymbols[p.fromIndex], chordSymbols[p.toIndex]);
            const notes: string[] = [];
            if (p.deceptiveResolution) notes.push("deceptive resolution");
            if (p.dominantResolvesConventionally === false) notes.push("dominant doesn't resolve conventionally (not an error - common in rock/blues)");
            return (
              <tr key={p.fromIndex}>
                <td>{chordSymbols[p.fromIndex]} &rarr; {chordSymbols[p.toIndex]}</td>
                <td>{p.commonTones.join(", ") || "-"}</td>
                <td>{p.bassMotionSemitones > 0 ? "+" : ""}{p.bassMotionSemitones} semitones</td>
                <td>{vl.suggestedInversion ? `Consider ${vl.suggestedInversion.symbol} (bass moves ${vl.suggestedInversion.bassMotionSemitones} semitones instead)` : "-"}</td>
                <td>{notes.join("; ") || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Alter the feel</h2>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {(Object.keys(TRANSFORMATIONS) as TransformationName[]).map((name) => (
          <button key={name} onClick={() => runTransformation(name)}>{TRANSFORMATIONS[name].label}</button>
        ))}
      </div>
      {preview && (
        <div>
          <p><strong>{TRANSFORMATIONS[preview.name].label}:</strong> {preview.chords.join(" | ")}</p>
          {level !== "off" && <p className="muted">{explanationFor(level, preview.reason)}</p>}
          <button onClick={applyPreview}>Apply to progression</button>
          <button onClick={() => setPreview(null)}>Discard</button>
        </div>
      )}
    </div>
  );
}
