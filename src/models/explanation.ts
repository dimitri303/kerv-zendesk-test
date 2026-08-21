// Shared "how much reasoning to show" helper for the explanation-level
// control (spec item 12: Off/Simple/Theory). Used by any tab that
// displays a theory-engine explanation string.
import type { ExplanationLevel } from "./types";

export function explanationFor(level: ExplanationLevel, text: string): string | null {
  if (level === "off") return null;
  if (level === "simple") {
    const firstClause = text.split(" - ")[0].replace(/\.+$/, "");
    return `${firstClause}.`;
  }
  return text;
}
