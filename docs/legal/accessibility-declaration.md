# Accessibility declaration — draft

**Status: draft, not published.** To be reviewed by Florine Pontaillac before any
publication. This declaration states only what has actually been verified — no
compliance level is claimed beyond what `docs/legal/rgaa-audit.md` supports.

## 1. Compliance status

**Not compliant.** This declaration covers three named screens only —
registration (`/inscription`), public profile (`/profils/:id`) and the recruiter
catalogue (`/recruteur/catalogue`) — checked against a specific subset of RGAA
concerns: full keyboard navigation, permanent focus visibility, and colour
contrast. It is not a full RGAA audit (106 criteria) and does not cover the rest
of the site.

## 2. Test results

Detailed methodology and measured values are in `docs/legal/rgaa-audit.md`. Summary:

- **Keyboard path and focus visibility: run, not read.** Each of the three
  screens was walked in a real browser with the keyboard alone, recording every
  Tab stop and checking on the live page that a focus ring was actually painted.
  Result: 12 stops on registration, 10 on the public profile, 75 on the recruiter
  catalogue, and **no stop without a visible ring**. Every control reported an
  accessible name. Transcript:
  `docs/preuves/AD-6-clavier-trois-ecrans.txt`.
- **One failure was found this way, and fixed.** Activating a video from the
  keyboard on the public profile page lost the focus to `<body>`, sending the
  reader back to the top of the document (WCAG 2.4.3). An earlier revision of
  this declaration, resting on a source review rather than a run, reported that
  screen as compliant. It was not. The player now takes focus as it appears, and
  the fix is covered by tests.
- **Contrast**: all text/background colour pairs used project-wide (not just on
  these three screens) were independently recomputed against the WCAG
  relative-luminance formula, in both the light and dark themes. Every pair
  clears the 4.5:1 AA threshold for normal text; the tightest margin is 4.85:1.
- **Video subtitles**: the demonstration video ProfilsActifs hosts itself carries
  a real French caption track, displayed by the player without the viewer
  enabling anything. Verified in the page — track loaded, `mode: showing`, the
  expected cue on screen at a given timestamp — not only photographed:
  `docs/preuves/AD-7-sous-titres-et-revocation.txt`. Embedded YouTube/Vimeo
  videos are outside this: we can ask their player to show captions, we cannot
  supply the track, and we do not claim one is present.

## 3. Content not evaluated

Everything outside the three named screens — the applicant feed, recruiter and
admin dashboards, the certification questionnaire, notifications — has not been
tested against RGAA and is not covered by this declaration. A full-site audit has
not been scheduled at this stage.

Within the three screens, only three concerns were checked: the keyboard path,
focus visibility, and contrast. Not evaluated anywhere: screen-reader behaviour,
heading structure, zoom and reflow, form-error announcement beyond the presence
of `aria-describedby`, and any browser other than Chrome at a desktop viewport.

## 4. How this declaration was prepared

Keyboard navigation and focus visibility were **exercised in a real browser**,
keyboard only, by a re-runnable script
(`scripts/preuves/clavier-trois-ecrans.mts`) that records each Tab stop and reads
the painted focus ring from the live page rather than judging it from a
screenshot. Contrast ratios were computed programmatically from the design
tokens' raw hex values, not estimated visually. The subtitle track was checked
through the media element's own API, not by looking at a picture of it.

Two limits of this method, stated because they bound what the results above are
worth: **no automated accessibility scanner** (no axe or equivalent, in CI or
otherwise), and **a single browser at a single viewport**. A different method, or
a real assistive technology, could surface issues this pass did not catch, even
within the three screens covered here.

## 5. Feedback and contact

[To be completed — contact address for reporting an accessibility issue, per
Florine Pontaillac.]

## 6. Enforcement

[To be completed — standard reference to the Défenseur des droits and the
applicable complaint procedure. Florine Pontaillac to supply the exact required
wording rather than have it drafted here.]
