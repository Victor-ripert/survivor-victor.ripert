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

- All three screens: full keyboard path verified by source review, no click
  handler found on a non-interactive element, no override of the project's global
  focus-visible style.
- All text/background colour pairs used project-wide (not just on these three
  screens) were independently recomputed against the WCAG relative-luminance
  formula, in both the light and dark themes. Every pair clears the 4.5:1 AA
  threshold for normal text; the tightest margin is 4.85:1.

## 3. Content not evaluated

Everything outside the three named screens — the applicant feed, recruiter and
admin dashboards, the certification questionnaire, notifications — has not been
tested against RGAA and is not covered by this declaration. Caption/subtitle
accessibility of video content is tracked separately and is not part of this
declaration's scope. A full-site audit has not been scheduled at this stage.

## 4. How this declaration was prepared

Verification was manual: keyboard navigation was checked by reading component
source for non-semantic interactive elements (e.g. a `<div>` with a click handler
instead of a `<button>`), and contrast ratios were computed programmatically from
the design tokens' raw hex values, not estimated visually. No automated
accessibility scanner was used — a different verification method could surface
issues this pass did not catch, even within the three screens covered here.

## 5. Feedback and contact

[To be completed — contact address for reporting an accessibility issue, per
Florine Pontaillac.]

## 6. Enforcement

[To be completed — standard reference to the Défenseur des droits and the
applicable complaint procedure. Florine Pontaillac to supply the exact required
wording rather than have it drafted here.]
