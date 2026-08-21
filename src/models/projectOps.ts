// Pure helper functions for editing a Project's sections/chords. Kept out
// of components so the progression-builder UI stays a thin view layer.
import type { ChordShape, Project, ProgressionChord, Section } from "./types";

export function allChordSymbols(project: Project): string[] {
  return project.sections.flatMap((s) => s.chords.map((c) => c.symbol));
}

export function lastChordSymbol(project: Project): string | null {
  const symbols = allChordSymbols(project);
  return symbols.length ? symbols[symbols.length - 1] : null;
}

function makeId(): string {
  return crypto.randomUUID();
}

export function newSection(name: string): Section {
  return { id: makeId(), name, chords: [] };
}

export function newChord(symbol: string, shape?: ChordShape): ProgressionChord {
  return { id: makeId(), symbol, shape };
}

export function addSection(project: Project, name: string): Project {
  return { ...project, sections: [...project.sections, newSection(name)] };
}

export function removeSection(project: Project, sectionId: string): Project {
  return { ...project, sections: project.sections.filter((s) => s.id !== sectionId) };
}

export function renameSection(project: Project, sectionId: string, name: string): Project {
  return {
    ...project,
    sections: project.sections.map((s) => (s.id === sectionId ? { ...s, name } : s)),
  };
}

export function moveSection(project: Project, fromIndex: number, toIndex: number): Project {
  const sections = [...project.sections];
  const [moved] = sections.splice(fromIndex, 1);
  sections.splice(toIndex, 0, moved);
  return { ...project, sections };
}

export function addChordToSection(project: Project, sectionId: string, chord: ProgressionChord): Project {
  return {
    ...project,
    sections: project.sections.map((s) => (s.id === sectionId ? { ...s, chords: [...s.chords, chord] } : s)),
  };
}

/** Append to the last section, creating a default "Verse" section first if
 * the project has none yet. */
export function addChordToLastSection(project: Project, symbol: string, shape?: ChordShape): Project {
  const chord = newChord(symbol, shape);
  if (project.sections.length === 0) {
    const section = newSection("Verse");
    section.chords.push(chord);
    return { ...project, sections: [section] };
  }
  const lastSection = project.sections[project.sections.length - 1];
  return addChordToSection(project, lastSection.id, chord);
}

export function removeChord(project: Project, sectionId: string, chordId: string): Project {
  return {
    ...project,
    sections: project.sections.map((s) =>
      s.id === sectionId ? { ...s, chords: s.chords.filter((c) => c.id !== chordId) } : s,
    ),
  };
}

export function updateChordSymbol(project: Project, sectionId: string, chordId: string, symbol: string): Project {
  return {
    ...project,
    sections: project.sections.map((s) =>
      s.id === sectionId
        ? { ...s, chords: s.chords.map((c) => (c.id === chordId ? { ...c, symbol } : c)) }
        : s,
    ),
  };
}

/** Replace every chord's symbol in progression order, keeping ids/shapes -
 * used to apply a whole-progression transformation (theory/transformations.ts). */
export function applyTransformedSymbols(project: Project, newSymbols: string[]): Project {
  let i = 0;
  return {
    ...project,
    sections: project.sections.map((s) => ({
      ...s,
      chords: s.chords.map((c) => ({ ...c, symbol: newSymbols[i++] ?? c.symbol })),
    })),
  };
}

export function moveChord(project: Project, sectionId: string, fromIndex: number, toIndex: number): Project {
  return {
    ...project,
    sections: project.sections.map((s) => {
      if (s.id !== sectionId) return s;
      const chords = [...s.chords];
      const [moved] = chords.splice(fromIndex, 1);
      chords.splice(toIndex, 0, moved);
      return { ...s, chords };
    }),
  };
}
