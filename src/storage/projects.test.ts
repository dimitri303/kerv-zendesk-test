import { describe, it, expect, beforeEach } from "vitest";
import {
  createProject, listProjects, loadProject, saveProject,
  deleteProject, renameProject, duplicateProject, exportProjectText,
} from "./projects";
import { BUILT_IN_TUNINGS } from "../theory/tunings";

// No jsdom dependency for this prototype - a minimal in-memory
// localStorage polyfill is enough to exercise the real storage code.
function installLocalStorageStub() {
  const data = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
  };
}

beforeEach(() => {
  installLocalStorageStub();
});

describe("project CRUD", () => {
  it("creates and loads a project", () => {
    const project = createProject("My Song");
    const loaded = loadProject(project.id);
    expect(loaded?.name).toBe("My Song");
    expect(loaded?.schemaVersion).toBe(1);
  });

  it("lists projects newest-first", () => {
    createProject("First");
    createProject("Second");
    const list = listProjects();
    expect(list.map((p) => p.name)).toContain("First");
    expect(list.map((p) => p.name)).toContain("Second");
  });

  it("renames a project", () => {
    const project = createProject("Old Name");
    renameProject(project.id, "New Name");
    expect(loadProject(project.id)?.name).toBe("New Name");
  });

  it("duplicates a project with a new id", () => {
    const project = createProject("Original");
    const copy = duplicateProject(project.id);
    expect(copy?.id).not.toBe(project.id);
    expect(copy?.name).toBe("Original copy");
  });

  it("deletes a project", () => {
    const project = createProject("Temp");
    deleteProject(project.id);
    expect(loadProject(project.id)).toBeNull();
  });

  it("saves updates to sections", () => {
    const project = createProject("Verses");
    const updated = saveProject({
      ...project,
      sections: [{ id: "s1", name: "Verse", chords: [{ id: "c1", symbol: "Am" }] }],
    });
    expect(loadProject(updated.id)?.sections[0].chords[0].symbol).toBe("Am");
  });
});

describe("exportProjectText", () => {
  it("includes title, tuning, capo, key, sections, and notes", () => {
    const project = createProject("Export Me", BUILT_IN_TUNINGS[0]);
    const withData = saveProject({
      ...project,
      capo: 2,
      key: { tonic: "G", mode: "major" },
      sections: [{ id: "s1", name: "Verse", chords: [{ id: "c1", symbol: "G" }, { id: "c2", symbol: "D" }] }],
      notes: "Write a bridge later.",
    });
    const text = exportProjectText(withData);
    expect(text).toContain("Export Me");
    expect(text).toContain("Capo: 2");
    expect(text).toContain("Key: G major");
    expect(text).toContain("[Verse]");
    expect(text).toContain("G | D");
    expect(text).toContain("Write a bridge later.");
  });
});
