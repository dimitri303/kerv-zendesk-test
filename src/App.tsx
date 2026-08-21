import { useEffect, useMemo, useState } from "react";
import type { Project, ScaleTypeName } from "./models/types";
import type { Mode } from "./theory/harmony";
import { findKey } from "./theory/harmony";
import { MODE_INFO } from "./theory/modes";
import { allChordSymbols } from "./models/projectOps";
import {
  createProject, getLastOpenedProjectId, loadProject, saveProject, setLastOpenedProjectId,
} from "./storage/projects";
import TopBar from "./components/TopBar";
import ProgressionView from "./components/ProgressionView";
import GuitarTab from "./pages/GuitarTab";
import NextChordTab from "./pages/NextChordTab";
import AnalyseTab from "./pages/AnalyseTab";
import ScalesTab from "./pages/ScalesTab";
import MelodyTab from "./pages/MelodyTab";

export type TabId = "guitar" | "next" | "analyse" | "scales" | "melody";
const TABS: { id: TabId; label: string }[] = [
  { id: "guitar", label: "Guitar" },
  { id: "next", label: "Next Chord" },
  { id: "analyse", label: "Analyse" },
  { id: "scales", label: "Scales" },
  { id: "melody", label: "Melody" },
];

export interface ActiveKey {
  tonic: string;
  /** Full mode/scale flavour (for display and the Scales tab). */
  scaleType: ScaleTypeName;
  /** Simplified major/minor frame the analysis engine (roman numerals,
   * suggestions, transformations) reasons in - see ASSUMPTIONS.md. */
  mode: Mode;
  inferred: boolean;
  ambiguous: boolean;
}

function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<TabId>("guitar");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const lastId = getLastOpenedProjectId();
    const existing = lastId ? loadProject(lastId) : null;
    const initial = existing ?? createProject("Untitled");
    setProject(initial);
    setLastOpenedProjectId(initial.id);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !project) return;
    saveProject(project);
    setLastOpenedProjectId(project.id);
    // Only re-run when the project itself changes; `loaded` flips once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const chordSymbols = useMemo(() => (project ? allChordSymbols(project) : []), [project]);
  const keyGuess = useMemo(() => findKey(chordSymbols), [chordSymbols]);

  const activeKey: ActiveKey = useMemo(() => {
    if (project?.key) {
      const scaleType = project.key.mode;
      return { tonic: project.key.tonic, scaleType, mode: MODE_INFO[scaleType].parallel as Mode, inferred: false, ambiguous: false };
    }
    if (keyGuess.best) {
      const scaleType: ScaleTypeName = keyGuess.best.mode === "major" ? "major" : "aeolian";
      return { tonic: keyGuess.best.tonic, scaleType, mode: keyGuess.best.mode, inferred: true, ambiguous: keyGuess.ambiguous };
    }
    return { tonic: "C", scaleType: "major", mode: "major", inferred: true, ambiguous: true };
  }, [project?.key, keyGuess]);

  if (!project) return null;

  return (
    <div>
      <TopBar project={project} setProject={setProject} activeKey={activeKey} keyGuess={keyGuess} />

      <ProgressionView project={project} setProject={setProject} />

      <nav className="row" style={{ margin: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              border: "none",
              borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              background: "none",
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === "guitar" && <GuitarTab project={project} setProject={setProject} />}
        {tab === "next" && <NextChordTab project={project} setProject={setProject} activeKey={activeKey} />}
        {tab === "analyse" && <AnalyseTab project={project} setProject={setProject} activeKey={activeKey} keyGuess={keyGuess} />}
        {tab === "scales" && <ScalesTab project={project} activeKey={activeKey} />}
        {tab === "melody" && <MelodyTab project={project} activeKey={activeKey} />}
      </main>
    </div>
  );
}

export default App;
