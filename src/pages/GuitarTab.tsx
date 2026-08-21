import { useEffect, useState } from "react";
import type { Project, FretValue, ChordDisplayPreference } from "../models/types";
import { soundingNotes, emptyShape } from "../theory/guitar";
import { detectChord } from "../theory/chordDetection";
import { addChordToLastSection } from "../models/projectOps";

interface Props {
  project: Project;
  setProject: (p: Project) => void;
}

function parseFret(raw: string): FretValue {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "" || trimmed === "x") return "x";
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.max(0, Math.min(24, Math.round(n))) : "x";
}

export default function GuitarTab({ project, setProject }: Props) {
  const [frets, setFrets] = useState<FretValue[]>(() => emptyShape(project.numStrings).frets);

  useEffect(() => {
    setFrets((prev) => {
      if (prev.length === project.numStrings) return prev;
      const next = emptyShape(project.numStrings).frets;
      for (let i = 0; i < Math.min(prev.length, next.length); i++) next[i] = prev[i];
      return next;
    });
  }, [project.numStrings]);

  const shape = { frets };
  const sounding = soundingNotes(project.tuning, project.capo, shape);
  const notes = sounding.filter((n): n is typeof n & { note: string } => n.note !== null).map((n) => n.note);
  const detection = detectChord(notes, project.key ? { tonic: project.key.tonic, mode: project.key.mode === "major" ? "major" : "minor" } : undefined);

  const setFret = (i: number, raw: string) => {
    const next = [...frets];
    next[i] = parseFret(raw);
    setFrets(next);
  };

  const setPreference = (pref: ChordDisplayPreference) => setProject({ ...project, chordDisplayPreference: pref });

  const addDetected = () => {
    if (!detection.best) return;
    setProject(addChordToLastSection(project, detection.best.symbol, shape));
  };

  const pref = project.chordDisplayPreference;

  return (
    <div>
      <h2>Guitar input</h2>
      <p className="muted">
        Enter a fret per string, low to high ({project.tuning.strings.length} strings, tuning: {project.tuning.name},
        capo {project.capo}). "x" or blank = muted. Frets are relative to the capo.
      </p>

      <div className="row">
        {frets.map((f, i) => (
          <label key={i}>
            {project.tuning.strings[i]}:
            <input
              value={f}
              onChange={(e) => setFret(i, e.target.value)}
              style={{ width: "2.5rem" }}
            />
          </label>
        ))}
        <button onClick={() => setFrets(emptyShape(project.numStrings).frets)}>Clear</button>
      </div>

      <div className="row">
        <label>Show:
          <select value={pref} onChange={(e) => setPreference(e.target.value as ChordDisplayPreference)}>
            <option value="sounding">Sounding chord</option>
            <option value="shape">Guitar shape</option>
            <option value="both">Both</option>
          </select>
        </label>
      </div>

      {(pref === "shape" || pref === "both") && (
        <table style={{ maxWidth: "30rem" }}>
          <tbody>
            <tr>
              <th>String</th>
              {project.tuning.strings.map((s, i) => <td key={i}>{s}</td>)}
            </tr>
            <tr>
              <th>Fret</th>
              {frets.map((f, i) => <td key={i}>{f}</td>)}
            </tr>
            <tr>
              <th>Sounds as</th>
              {sounding.map((n, i) => <td key={i}>{n.note ?? "-"}</td>)}
            </tr>
          </tbody>
        </table>
      )}

      {(pref === "sounding" || pref === "both") && notes.length > 0 && (
        <div>
          <h3>Chord identification</h3>
          <ul>
            <li>Notes played: {notes.join(", ")}</li>
            <li>Bass note: {detection.bass}</li>
            {detection.best ? (
              <>
                <li>Most likely: <strong>{detection.best.symbol}</strong> (root {detection.best.root}{detection.best.isSlash ? `, bass ${detection.best.bass}` : ""})</li>
                {detection.best.missingNotes.length > 0 && (
                  <li className="muted">Assumes omitted: {detection.best.missingNotes.join(", ")}</li>
                )}
              </>
            ) : (
              <li>No chord match (try adding more notes).</li>
            )}
          </ul>
          {detection.alternatives.length > 0 && (
            <p className="muted">
              Alternatives: {detection.alternatives.map((a) => a.symbol).join(", ")}
            </p>
          )}
          {detection.best && <button onClick={addDetected}>Add {detection.best.symbol} to progression</button>}
        </div>
      )}
      {notes.length === 0 && <p className="muted">No strings sounding yet.</p>}
    </div>
  );
}
