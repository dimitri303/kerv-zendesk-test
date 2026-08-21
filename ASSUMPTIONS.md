# Assumptions

Places where the spec was ambiguous or underspecified and a simplest-reasonable-version
call was made rather than guessing silently or over-building.

## Roman numeral convention

Every roman numeral in the app (diatonic, borrowed, secondary dominant, chromatic mediant...)
is spelled relative to the **major scale** of the tonic, regardless of whether the key itself
is major or minor. So a natural-minor key's diatonic chords read `i, ii°, bIII, iv, v, bVI,
bVII` rather than being renumbered per-mode. This is a common rock/pop/jazz convention, gives
one unambiguous system, and lets borrowed-chord/secondary-dominant logic work identically in
major and minor keys. See `src/theory/romanNumerals.ts`.

## Key vs. mode, and the analysis engine's major/minor frame

A project's key (`project.key`) carries a full mode (`major`, `dorian`, `phrygian`, `lydian`,
`mixolydian`, `aeolian`, `locrian`, `harmonic minor`, `melodic minor`) for display purposes
(the Scales tab, characteristic-note highlighting, etc).

The functional-harmony engine (roman numerals, next-chord suggestions, "alter the feel"
transformations, melody harmonisation) reasons in a simplified **major/minor** frame instead
of building separate diatonic-quality tables for all nine modes: `major`/`lydian`/`mixolydian`
map to a major frame, everything else maps to a minor frame (`src/theory/modes.ts`'s
`MODE_INFO[...].parallel`). A mode's characteristic chord (e.g. Dorian's natural-6th IV chord)
then correctly surfaces as "modal interchange" relative to that frame, which is a defensible
reading - Dorian genuinely sits between natural minor and major from a functional-harmony
point of view.

## "Where can I go next?" tiers vs. adventure levels

Spec item 6 groups next-chord suggestions as Safe / Colour / Modal-Borrowed / Adventurous;
item 7 separately describes four adventure levels (Conventional, Colourful, Adventurous,
"What the hell?"). These describe the same underlying concept, so they were merged into one
four-tier system (`conventional`, `colourful`, `adventurous`, `what-the-hell`). Each
suggestion also carries a `technique` tag (`diatonic`, `secondary-dominant`,
`modal-interchange`, `tritone-sub`, `chromatic-mediant`, `diminished-passing`,
`altered-dominant`, `parallel-key`, `pedal-point`, `blues-convention`), so "this was modal
borrowing" is visible as a reason rather than needing its own tier.

## Chord detection on incomplete voicings

Tonal's own `Chord.detect` returns nothing for incomplete voicings (e.g. root+3rd with no
5th). `src/theory/chordDetection.ts` re-implements matching directly against Tonal's
`ChordType` dictionary (which correctly enumerates every interval/chroma pattern) with
subset-matching for up to 2 omitted notes, so guitar voicings that skip a 5th or use a
rootless shape still resolve to a sensible chord name. Tonal's own "explicit omission" chord
types (e.g. `7no5`) are deprioritised in favour of reading the same notes as an incomplete
voicing of the more common full chord.

## Key-finding

`findKey` uses a Krumhansl-Schmuckler-style correlation: a weighted pitch-class histogram
built from the progression's chord tones (root weighted heaviest, 3rd/5th next, extensions
lightest - a stand-in for "how strongly a tone defines the sonority," since chord symbols
carry no duration information) is correlated against all 24 rotated major/minor
tonal-hierarchy profiles. If the top two candidates are within 0.03 correlation, the result
is flagged `ambiguous` rather than forcing a single answer.

## Capo/fret input convention

Frets entered in the Guitar tab are **relative to the capo**, matching how guitarists
actually think about a shape played with a capo on ("fret 0" = ring open at the capo). The
true distance from the nut is `capo + fret`. This matches the spec's own worked example:
standard tuning, capo 2, open-G shape (`3 2 0 0 0 3`) sounds as A major.

## Enharmonic spelling

Raw sounding-note computation (`guitar.ts`) uses Tonal's default (flat-biased) spelling
throughout - it's a pure pitch calculation. Key-aware respelling (choosing `Bb` over `A#` in
a flat key, keeping accidentals consistent within one key context) happens at the display /
chord-naming layer via `spellInKey`/`spellMatchInKey`, not at the raw-pitch layer.

## Target notes (chord tone / safe / colour / avoid)

Rather than encoding a full academic avoid-note table per chord type, one broadly-agreed
practical rule is used: a scale note a half step above a chord tone is an avoid tone. The
scale's own characteristic tone (from `modeCharacteristic`) is labelled "colour"; everything
else non-clashing is "safe scale."

## Melody-first mode

Kept deliberately simple per the spec's own direction: a note sequence is harmonised as one
whole phrase (which chord(s) could sit under the whole run of notes), not as a full per-note
reharmonisation engine.

## Project storage

Projects autosave to `localStorage` on every change rather than requiring an explicit "Save"
button - simpler and more forgiving for a local-first tool, while Rename/Duplicate/Delete/
Export stay explicit actions per the spec.

## Tonic picklists

The key/tonic dropdowns in the UI offer one conventional spelling per pitch class (e.g. `Db`
for major keys, `C#` for minor keys) rather than every enharmonic spelling - a reasonable,
commonly-used convention, not meant to be exhaustive.
