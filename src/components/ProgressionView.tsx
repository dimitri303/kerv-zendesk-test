import { useState } from "react";
import { Chord } from "tonal";
import type { Project } from "../models/types";
import {
  addChordToSection, addSection, moveChord, moveSection,
  newChord, removeChord, removeSection, renameSection, updateChordSymbol,
} from "../models/projectOps";

interface Props {
  project: Project;
  setProject: (p: Project) => void;
}

const SECTION_PRESETS = ["Intro", "Verse", "Pre-Chorus", "Chorus", "Bridge", "Outro"];

export default function ProgressionView({ project, setProject }: Props) {
  const [newSectionName, setNewSectionName] = useState(SECTION_PRESETS[1]);
  const [chordInputs, setChordInputs] = useState<Record<string, string>>({});

  const handleAddSection = () => {
    setProject(addSection(project, newSectionName || "Section"));
  };

  const handleAddChord = (sectionId: string) => {
    const raw = (chordInputs[sectionId] ?? "").trim();
    if (!raw) return;
    if (Chord.get(raw).empty) {
      alert(`"${raw}" isn't a chord symbol Tonal recognises. Try e.g. "Am7", "G/B", "Dsus4".`);
      return;
    }
    setProject(addChordToSection(project, sectionId, newChord(raw)));
    setChordInputs({ ...chordInputs, [sectionId]: "" });
  };

  return (
    <div>
      <h1>{project.name}</h1>
      {project.sections.length === 0 && <p className="muted">No sections yet - add one below.</p>}
      {project.sections.map((section, sIndex) => (
        <div key={section.id} style={{ margin: "0.4rem 0" }}>
          <div className="row">
            <strong>
              <input
                value={section.name}
                onChange={(e) => setProject(renameSection(project, section.id, e.target.value))}
                style={{ fontWeight: 600, width: "8rem" }}
              />
            </strong>
            <button disabled={sIndex === 0} onClick={() => setProject(moveSection(project, sIndex, sIndex - 1))}>up</button>
            <button disabled={sIndex === project.sections.length - 1} onClick={() => setProject(moveSection(project, sIndex, sIndex + 1))}>down</button>
            <button onClick={() => setProject(removeSection(project, section.id))}>remove section</button>
          </div>

          <div className="row" style={{ flexWrap: "wrap" }}>
            {section.chords.length === 0 && <span className="muted">(no chords)</span>}
            {section.chords.map((chord, cIndex) => (
              <span key={chord.id} className="tag row" style={{ gap: "0.2rem" }}>
                <input
                  value={chord.symbol}
                  onChange={(e) => setProject(updateChordSymbol(project, section.id, chord.id, e.target.value))}
                  style={{ width: `${Math.max(3, chord.symbol.length + 1)}ch`, border: "none", background: "transparent", padding: 0 }}
                />
                <button
                  disabled={cIndex === 0}
                  onClick={() => setProject(moveChord(project, section.id, cIndex, cIndex - 1))}
                  title="move earlier"
                  style={{ padding: "0 0.2rem" }}
                >
                  &lt;
                </button>
                <button
                  disabled={cIndex === section.chords.length - 1}
                  onClick={() => setProject(moveChord(project, section.id, cIndex, cIndex + 1))}
                  title="move later"
                  style={{ padding: "0 0.2rem" }}
                >
                  &gt;
                </button>
                <button onClick={() => setProject(removeChord(project, section.id, chord.id))} title="remove" style={{ padding: "0 0.2rem" }}>
                  x
                </button>
              </span>
            ))}
          </div>

          <div className="row">
            <input
              placeholder="Type a chord, e.g. Am7"
              value={chordInputs[section.id] ?? ""}
              onChange={(e) => setChordInputs({ ...chordInputs, [section.id]: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAddChord(section.id)}
              style={{ width: "10rem" }}
            />
            <button onClick={() => handleAddChord(section.id)}>Add chord</button>
          </div>
        </div>
      ))}

      <div className="row">
        <select value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)}>
          {SECTION_PRESETS.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="Custom">Custom...</option>
        </select>
        {newSectionName === "Custom" && (
          <input placeholder="Section name" onChange={(e) => setNewSectionName(e.target.value)} style={{ width: "8rem" }} />
        )}
        <button onClick={handleAddSection}>Add section</button>
      </div>

      <div>
        <label>
          Notes:
          <textarea
            value={project.notes}
            onChange={(e) => setProject({ ...project, notes: e.target.value })}
            rows={2}
            style={{ width: "100%" }}
          />
        </label>
      </div>
    </div>
  );
}
