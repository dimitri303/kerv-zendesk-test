// localStorage-backed project CRUD, plus plain-text export (spec item 16).
// No backend, no accounts - everything lives in one localStorage key.
import type { Project, Tuning } from "../models/types";
import { BUILT_IN_TUNINGS } from "../theory/tunings";

const STORAGE_KEY = "songwriting-assistant:projects-v1";
const LAST_OPENED_KEY = "songwriting-assistant:last-opened-id";

export function getLastOpenedProjectId(): string | null {
  try {
    return window.localStorage.getItem(LAST_OPENED_KEY);
  } catch {
    return null;
  }
}

export function setLastOpenedProjectId(id: string): void {
  try {
    window.localStorage.setItem(LAST_OPENED_KEY, id);
  } catch {
    // Best-effort only - not having a remembered project just means the
    // app opens Untitled next time, which is a fine fallback.
  }
}

interface ProjectStore {
  [id: string]: Project;
}

function readStore(): ProjectStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    // Corrupt or inaccessible storage - treat as empty rather than crashing the app.
    return {};
  }
}

function writeStore(store: ProjectStore): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export function listProjects(): ProjectSummary[] {
  const store = readStore();
  return Object.values(store)
    .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function loadProject(id: string): Project | null {
  return readStore()[id] ?? null;
}

export function saveProject(project: Project): Project {
  const store = readStore();
  const updated: Project = { ...project, updatedAt: new Date().toISOString() };
  store[project.id] = updated;
  writeStore(store);
  return updated;
}

export function deleteProject(id: string): void {
  const store = readStore();
  delete store[id];
  writeStore(store);
}

export function renameProject(id: string, name: string): Project | null {
  const project = loadProject(id);
  if (!project) return null;
  return saveProject({ ...project, name });
}

export function duplicateProject(id: string): Project | null {
  const project = loadProject(id);
  if (!project) return null;
  const now = new Date().toISOString();
  const copy: Project = {
    ...project,
    id: `project-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    name: `${project.name} copy`,
    createdAt: now,
    updatedAt: now,
  };
  return saveProject(copy);
}

export function createProject(name: string, tuning: Tuning = BUILT_IN_TUNINGS[0]): Project {
  const now = new Date().toISOString();
  const project: Project = {
    schemaVersion: 1,
    id: `project-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    name,
    tuning,
    numStrings: tuning.strings.length,
    capo: 0,
    sections: [],
    customTunings: [],
    notes: "",
    explanationLevel: "simple",
    chordDisplayPreference: "both",
    createdAt: now,
    updatedAt: now,
  };
  return saveProject(project);
}

/** Plain-text export: title, tuning, capo, key, mode, sections with chords, notes. */
export function exportProjectText(project: Project): string {
  const lines: string[] = [];
  lines.push(project.name);
  lines.push("=".repeat(project.name.length));
  lines.push("");
  lines.push(`Tuning: ${project.tuning.name} (${project.tuning.strings.join(" ")})`);
  lines.push(`Capo: ${project.capo}`);
  if (project.key) lines.push(`Key: ${project.key.tonic} ${project.key.mode}`);
  lines.push("");
  for (const section of project.sections) {
    lines.push(`[${section.name}]`);
    lines.push(section.chords.map((c) => c.symbol).join(" | ") || "(no chords)");
    lines.push("");
  }
  if (project.notes.trim()) {
    lines.push("Notes:");
    lines.push(project.notes.trim());
    lines.push("");
  }
  return lines.join("\n");
}
