# Songwriting & music theory assistant

A local-first, single-tab web app for songwriting and music theory assistance, aimed at
guitarists. Spartan by design: plain lists/tables/forms, no dashboards or visual polish.
See `ASSUMPTIONS.md` for places where an ambiguous requirement was resolved with the
simplest reasonable version.

## Running it locally

```bash
npm install
npm run dev      # starts the Vite dev server, prints a local URL
```

Everything is client-side - no backend, no accounts. Projects are saved to your browser's
`localStorage`.

Other scripts:

```bash
npm run build     # type-checks and builds a production bundle to dist/
npm run test      # runs the Vitest suite once
npm run test:watch
npm run lint       # oxlint
```

## What it does

- **Guitar**: enter a fret per string (tuning, capo, and custom tunings supported) and see
  the sounding notes plus the most likely chord name(s), including inversions, slash chords,
  and incomplete voicings.
- **"chart" buttons**: any chord symbol shown anywhere (the progression, next-chord
  suggestions) has a "chart" toggle that finds a playable fret shape for it in the project's
  *current* tuning and capo - including alternate/custom tunings like Open G, where the usual
  memorised shapes don't apply.
- **Progression builder**: sections (Intro/Verse/Chorus/...) of chords, editable, reorderable,
  entered by typing a chord name or from the Guitar tab.
- **Next Chord**: rule-based "where can this go next?" suggestions grouped Conventional /
  Colourful / Adventurous / What the hell?, plus "keep this note" / "keep this bass note"
  tools.
- **Analyse**: key-finding, roman numeral analysis, borrowed chords, secondary dominants,
  tritone subs, chromatic mediants, common tones, bass motion, voice-leading (inversion)
  suggestions, and ten deterministic "alter the feel" transformations (darker, brighter,
  more tense, ...).
- **Scales**: explore any of nine scale/mode types (major, the six other modes, harmonic and
  melodic minor), see diatonic chords and each mode's characteristic note/chord, and get
  scale suggestions for the current progression and for each chord in it.
- **Melody**: target notes (chord tone / safe / colour / avoid) for soloing over a chosen
  chord and scale, plus melody-first mode - enter a note sequence and get harmonisation
  suggestions.

Theory logic lives entirely under `src/theory/` (and `src/models`, `src/storage`), decoupled
from the UI in `src/components`/`src/pages`. It's built on [Tonal.js](https://github.com/tonaljs/tonal)
for note/interval/chord/scale/key math; bespoke code was written only for the genuine gaps
Tonal doesn't cover (guitar tuning/fret/capo math, custom-tuning-aware chord detection,
next-chord suggestion rules, voice leading, and the "alter the feel" transformations).

## Tests

`npm run test` runs the Vitest suite (85+ tests) covering tuning/capo pitch math, chord
detection (including incomplete voicings and slash chords), scale/mode generation, roman
numeral analysis, key-finding, next-chord suggestions, transformations, melody harmonisation,
chord-voicing search, and project storage.
