import { useState } from "react";
import type { Project } from "../models/types";
import { MAJOR_KEY_NAMES, MINOR_KEY_NAMES, type KeyFindingResult } from "../theory/harmony";
import { ALL_SCALE_TYPES } from "../theory/scales";
import { MODE_INFO } from "../theory/modes";
import { BUILT_IN_TUNINGS, tuningsForStringCount, makeCustomTuning } from "../theory/tunings";
import {
  createProject, deleteProject, duplicateProject, exportProjectText,
  listProjects, loadProject, renameProject, setLastOpenedProjectId,
} from "../storage/projects";
import type { ActiveKey } from "../App";

interface Props {
  project: Project;
  setProject: (p: Project) => void;
  activeKey: ActiveKey;
  keyGuess: KeyFindingResult;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TopBar({ project, setProject, activeKey, keyGuess }: Props) {
  const [customTuningInput, setCustomTuningInput] = useState("");

  const tuningOptions = [
    ...tuningsForStringCount(project.numStrings),
    ...project.customTunings.filter((t) => t.strings.length === project.numStrings),
  ];

  const setNumStrings = (n: number) => {
    const fallback = tuningsForStringCount(n)[0] ?? BUILT_IN_TUNINGS[0];
    setProject({ ...project, numStrings: n, tuning: fallback });
  };

  const setTuningById = (id: string) => {
    const tuning = [...BUILT_IN_TUNINGS, ...project.customTunings].find((t) => t.id === id);
    if (tuning) setProject({ ...project, tuning });
  };

  const addCustomTuning = () => {
    const strings = customTuningInput.trim().split(/\s+/);
    if (strings.length !== project.numStrings) {
      alert(`Enter exactly ${project.numStrings} notes, low to high (e.g. "E2 A2 D3 G3 B3 E4").`);
      return;
    }
    const tuning = makeCustomTuning(`Custom (${customTuningInput.trim()})`, strings);
    setProject({ ...project, tuning, customTunings: [...project.customTunings, tuning] });
    setCustomTuningInput("");
  };

  const toggleAutoKey = () => {
    if (project.key) {
      setProject({ ...project, key: undefined });
    } else {
      setProject({ ...project, key: { tonic: activeKey.tonic, mode: activeKey.scaleType } });
    }
  };

  const setKeyTonic = (tonic: string) => setProject({ ...project, key: { tonic, mode: activeKey.scaleType } });
  const setKeyMode = (mode: typeof activeKey.scaleType) => setProject({ ...project, key: { tonic: activeKey.tonic, mode } });

  const tonicList = activeKey.mode === "major" ? MAJOR_KEY_NAMES : MINOR_KEY_NAMES;

  // --- project management ---
  const projects = listProjects();
  const switchProject = (id: string) => {
    const p = loadProject(id);
    if (p) {
      setProject(p);
      setLastOpenedProjectId(p.id);
    }
  };
  const handleNew = () => {
    const name = window.prompt("New project name:", "Untitled");
    if (!name) return;
    const p = createProject(name, project.tuning);
    setProject(p);
    setLastOpenedProjectId(p.id);
  };
  const handleRename = () => {
    const name = window.prompt("Rename project:", project.name);
    if (!name) return;
    const updated = renameProject(project.id, name);
    if (updated) setProject(updated);
  };
  const handleDuplicate = () => {
    const copy = duplicateProject(project.id);
    if (copy) {
      setProject(copy);
      setLastOpenedProjectId(copy.id);
    }
  };
  const handleDelete = () => {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    deleteProject(project.id);
    const remaining = listProjects();
    const next = remaining[0] ? loadProject(remaining[0].id) : createProject("Untitled");
    if (next) {
      setProject(next);
      setLastOpenedProjectId(next.id);
    }
  };
  const handleExport = () => downloadText(`${project.name}.txt`, exportProjectText(project));

  return (
    <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
      <div className="row">
        <select value={project.id} onChange={(e) => switchProject(e.target.value)}>
          {projects.length === 0 && <option value={project.id}>{project.name}</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button onClick={handleNew}>New</button>
        <button onClick={handleRename}>Rename</button>
        <button onClick={handleDuplicate}>Duplicate</button>
        <button onClick={handleDelete}>Delete</button>
        <button onClick={handleExport}>Export .txt</button>
      </div>

      <div className="row" style={{ marginTop: "0.4rem" }}>
        <label>
          Project:
          <input
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            style={{ width: "10rem" }}
          />
        </label>

        <label>
          <input type="checkbox" checked={!project.key} onChange={toggleAutoKey} />
          Auto key
        </label>
        <label>
          Key:
          <select value={activeKey.tonic} onChange={(e) => setKeyTonic(e.target.value)} disabled={!project.key}>
            {tonicList.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>
          Mode:
          <select value={activeKey.scaleType} onChange={(e) => setKeyMode(e.target.value as typeof activeKey.scaleType)} disabled={!project.key}>
            {ALL_SCALE_TYPES.map((t) => <option key={t} value={t}>{MODE_INFO[t].label}</option>)}
          </select>
        </label>
        {activeKey.inferred && (
          <span className="muted">
            (inferred{keyGuess.ambiguous ? ", ambiguous" : ""}
            {keyGuess.alternatives[0] ? ` - also possibly ${keyGuess.alternatives[0].tonic} ${keyGuess.alternatives[0].mode}` : ""})
          </span>
        )}
      </div>

      <div className="row" style={{ marginTop: "0.4rem" }}>
        <label>
          Strings:
          <select value={project.numStrings} onChange={(e) => setNumStrings(Number(e.target.value))}>
            {[6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>
          Tuning:
          <select value={project.tuning.id} onChange={(e) => setTuningById(e.target.value)}>
            {tuningOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <span className="muted">({project.tuning.strings.join(" ")})</span>
        <label>
          Capo:
          <input
            type="number" min={0} max={12} value={project.capo}
            onChange={(e) => setProject({ ...project, capo: Math.max(0, Math.min(12, Number(e.target.value))) })}
            style={{ width: "3rem" }}
          />
        </label>
        <label>
          <input
            placeholder={`${project.numStrings} notes low-to-high, e.g. D2 A2 D3 G3 A3 D4`}
            value={customTuningInput}
            onChange={(e) => setCustomTuningInput(e.target.value)}
            style={{ width: "16rem" }}
          />
        </label>
        <button onClick={addCustomTuning}>Save custom tuning</button>
      </div>
    </div>
  );
}
