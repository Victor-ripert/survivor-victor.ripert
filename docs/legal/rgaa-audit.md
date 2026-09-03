# RGAA AA audit — three imposed screens

Scope: registration (`/inscription`), public profile (`/profils/:id`), recruiter
catalogue (`/recruteur/catalogue`) — the three screens named in the brief. Each
owner corrects their own screen; this document consolidates the result. No
correction was needed on this pass — see findings below.

## Methodology

Contrast ratios were **recomputed independently** from the raw hex values in
`packages/web/src/styles/global.css`, using the WCAG relative-luminance formula
(not copied from the file's own comments, which describe the same values but are
not themselves a measurement). Keyboard and focus behaviour were verified by
reading the component source of all three screens and their shared building
blocks (`ProfileCard.tsx`, `PublicProfileCard.tsx`), checking for click handlers
on non-interactive elements and any override of the global focus style.

## Contrast — measured, light theme

| Text token                    | On `surface-page` (#f4f6f9) | On `surface-1` (#ffffff) |
| ------------------------------ | ---------------------------- | -------------------------- |
| text-primary                   | 16.44:1                      | 17.79:1                    |
| text-secondary                 | 7.09:1                       | 7.68:1                     |
| text-muted (tightest margin)   | 4.85:1                       | 5.25:1                     |
| brand-blue / accent            | 10.41:1                      | 11.27:1                    |
| status-good                    | 5.08:1                       | 5.50:1                     |
| status-warning                 | 5.47:1                       | 5.93:1                     |
| status-critical                | 6.04:1                       | 6.54:1                     |

## Contrast — measured, dark theme (`prefers-color-scheme: dark`)

| Text token           | On `surface-page` (#10141b) | On `surface-1` (#171d26) |
| --------------------- | ---------------------------- | -------------------------- |
| text-primary           | 18.45:1                       | 16.93:1                     |
| text-secondary           | 10.14:1                        | 9.31:1                        |
| text-muted                 | 6.96:1                           | 6.38:1                          |
| accent (lightened tint)      | 7.62:1                             | 6.99:1                            |
| status-good                     | 10.11:1                              | 9.27:1                               |
| status-warning                     | 11.12:1                                | 10.21:1                                  |
| status-critical                       | 7.71:1                                   | 7.07:1                                     |

All pairs clear the AA threshold for normal text (4.5:1) with margin. The one
declared gap — the light theme's institutional blue (`#1b3a6b`) measuring 1.50:1
on the dark surface — is not shipped: the dark theme substitutes a lighter tint of
the same hue (`#85a8e0`, 6.99:1–7.62:1) specifically because the literal charte
colour fails on a dark ground.

## Keyboard & focus — per screen

| Screen                  | Interactive elements                                                                                                      | Result                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `/inscription`             | Native inputs, select, checkbox, submit button — all real form controls with `<label>`s and `aria-describedby` error messages | Pass — full keyboard path, no custom widgets to trap focus       |
| `/profils/:id`                | "Contacter" (`<button type="button">`), video preview trigger (`<button>`), navigation links (`<Link>`)                          | Pass — no click handler on a non-interactive element                |
| `/recruteur/catalogue`           | Favorite toggle, video preview, "Voir le profil" (`<Link>`), contact — all in `ProfileCard.tsx`, all real `<button>`/`<Link>`         | Pass                                                                    |

Global `:focus-visible` rule (`global.css`) applies a visible ring on every
focusable element project-wide and is not overridden by any of the three screens
or their shared components — focus stays visible permanently, not just on a
subset of controls.

## Outcome

No corrections required on this pass. If any design token's hex value changes in
the future, `text-muted` (4.85:1 light) is the first pair to re-check — it has the
least margin above the 4.5:1 threshold of everything measured.
