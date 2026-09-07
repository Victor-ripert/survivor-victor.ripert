# RGAA AA audit — three imposed screens

Scope: registration (`/inscription`), public profile (`/profils/:id`), recruiter
catalogue (`/recruteur/catalogue`) — the three screens named in the brief. Each
owner corrects their own screen; this document consolidates the result.

**This pass found and fixed a defect the previous one reported as a pass.** The
7 September revision of this document said keyboard behaviour had been verified;
it had been _read_, not run. Running it turned up a genuine WCAG 2.4.3 failure on
the public profile page — see "Keyboard & focus" below.

## Methodology

**Contrast** ratios were **recomputed independently** from the raw hex values in
`packages/web/src/styles/global.css`, using the WCAG relative-luminance formula
(not copied from the file's own comments, which describe the same values but are
not themselves a measurement).

**Keyboard and focus** were, until 7 September, checked by reading component
source for click handlers on non-interactive elements and overrides of the global
focus style. That method establishes the absence of one class of mistake; it does
not establish that the tab order is usable, that focus survives a state change,
or that the ring is actually painted. It is not what the brief asks for.

They are now driven in a real browser, keyboard only, no mouse:
`scripts/preuves/clavier-trois-ecrans.mts` loads each screen fresh, presses
`Tab`, and at every stop records the focused element, its accessible name, and
whether a ring is genuinely painted — `:focus-visible` matching **and** a
non-empty computed `box-shadow`, read from the live page rather than judged from
a screenshot. The sweep ends when the tab order loops back to its first element,
so the transcript is the screen's full set of stops and says so when it is not.

Transcript and screen captures: `docs/preuves/AD-6-clavier-trois-ecrans.txt` and
`docs/preuves/AD-6-clavier-trois-ecrans/`. It is re-runnable; the commit and
branch it ran against are in its header.

## Contrast — measured, light theme

| Text token                   | On `surface-page` (#f4f6f9) | On `surface-1` (#ffffff) |
| ---------------------------- | --------------------------- | ------------------------ |
| text-primary                 | 16.44:1                     | 17.79:1                  |
| text-secondary               | 7.09:1                      | 7.68:1                   |
| text-muted (tightest margin) | 4.85:1                      | 5.25:1                   |
| brand-blue / accent          | 10.41:1                     | 11.27:1                  |
| status-good                  | 5.08:1                      | 5.50:1                   |
| status-warning               | 5.47:1                      | 5.93:1                   |
| status-critical              | 6.04:1                      | 6.54:1                   |

## Contrast — measured, dark theme (`prefers-color-scheme: dark`)

| Text token              | On `surface-page` (#10141b) | On `surface-1` (#171d26) |
| ----------------------- | --------------------------- | ------------------------ |
| text-primary            | 18.45:1                     | 16.93:1                  |
| text-secondary          | 10.14:1                     | 9.31:1                   |
| text-muted              | 6.96:1                      | 6.38:1                   |
| accent (lightened tint) | 7.62:1                      | 6.99:1                   |
| status-good             | 10.11:1                     | 9.27:1                   |
| status-warning          | 11.12:1                     | 10.21:1                  |
| status-critical         | 7.71:1                      | 7.07:1                   |

All pairs clear the AA threshold for normal text (4.5:1) with margin. The one
declared gap — the light theme's institutional blue (`#1b3a6b`) measuring 1.50:1
on the dark surface — is not shipped: the dark theme substitutes a lighter tint of
the same hue (`#85a8e0`, 6.99:1–7.62:1) specifically because the literal charte
colour fails on a dark ground.

## Keyboard & focus — measured, per screen

Counts are Tab stops actually observed, in one run, on the seeded demonstration
data. "Without a ring" counts stops where `:focus-visible` did not match or no
`box-shadow` was painted.

| Screen                 | Tab stops | Without a ring | Sweep ended because                   |
| ---------------------- | --------- | -------------- | ------------------------------------- |
| `/inscription`         | 12        | 0              | reached the submit button             |
| `/profils/:id`         | 10        | 0              | tab order looped to its first element |
| `/recruteur/catalogue` | 75        | 0              | tab order looped to its first element |

Every stop on all three screens carried a visible ring, and every control
reported an accessible name — via `aria-label`, a `for`-associated `<label>`, or
the `<label>` it is nested in. The two catalogue filter checkboxes have no `id`
and are told apart only by their wrapping label, which is correct for a screen
reader and worth recording because it is easy to break.

### The defect this pass found, and the fix

On `/profils/:id`, activating a video from the keyboard **lost the focus
entirely**. The poster is a `<button>`; activating it unmounts that button and
mounts the player in its place, and nothing took focus afterwards. The keyboard
fell back to `<body>`, so the next `Tab` restarted at the top of the document
rather than continuing from the video. A reader who pressed `Enter` on a video
was silently sent back to the page header. That is WCAG 2.4.3 (Focus Order), and
the previous revision of this document recorded the screen as a pass.

A second, quieter problem sat behind it: when the embedded `<iframe>` did take
focus, it painted no ring, because an `<iframe>` does not reliably match
`:focus-visible`.

Both are fixed in `packages/web/src/components/VideoPlayer.tsx` and
`packages/web/src/styles/global.css`:

- the player takes focus as it mounts, through a ref callback, so the reader
  stays where they were and lands on the thing they just asked for;
- `.video-frame:focus` paints the ring explicitly rather than relying on the
  `:focus-visible` heuristic;
- the player's focusability is stated (`tabIndex={0}`) rather than inherited
  from `controls`.

The transcript now records `reprise du focus à l'activation d'une vidéo : true`,
and two unit tests in `packages/web/test/components/VideoPlayer.test.tsx` fail if
the handover is removed.

## Outcome

One defect found, fixed, and re-verified in the same pass; no other correction
required. Two things to re-check first if anything changes:

- `text-muted` (4.85:1 light) has the least margin above the 4.5:1 threshold of
  everything measured — it is the first pair a token change would break.
- The keyboard sweep is a snapshot of one run against seeded data. It is a
  script, not a claim: re-run it after any change to the header, the video
  player, or the catalogue filters.

## What this audit still does not cover

Named plainly, because a declaration built on it must not overstate it:

- **Only the three imposed screens.** The feed, the questionnaire, the
  dashboards, notifications and the whole admin space are untested.
- **Only three concerns** — keyboard path, focus visibility, contrast. Not the
  106 RGAA criteria: no screen-reader pass, no heading-structure review, no zoom
  or reflow testing, no form-error announcement checks beyond the presence of
  `aria-describedby`.
- **No automated scanner.** No axe or equivalent runs in CI, so nothing prevents
  a regression outside the three checks scripted above.
- **One browser.** Chrome, at 1280×900. No Firefox, no Safari, no real
  assistive technology, no mobile viewport.
