# JibJob — Final Specification (Consolidated)

**Ministère du Job et Bonheur, Digital and Innovation Directorate**
Reference: JEB/DNI/2026-003 — Version 1.1, reviewed by the Minister
Project name: **JibJob** (formerly "ProfilsActifs" — renamed by the Minister)

**Contacts:**

- Florine Pontaillac — legal advisor — f.pontaillac@job-et-bonheur.fr
- Thomas Vignal — digital advisor — t.vignal@job-et-bonheur.fr
- Benjamin Sellami — communications advisor (main point of contact for X) — b.sellami@job-et-bonheur.fr

---

## 1. Concept

JibJob is a TikTok-style social network for job seekers, not a passive resume tool. Candidates post short vertical videos of themselves; companies browse the feed and "like" candidates. The video is the core of the product — the profile is secondary.

---

## 2. Functional Scope

### 2.1 Job seeker space

- Create a professional profile (identity, skills, target sector, location)
- Publish presentation videos. The feed must replicate a TikTok-style experience: vertical scroll, full screen, autoplay, no distractions.
- Complete the JEB certification questionnaire (see §2.2) to obtain the **"JEB Work Permit"** badge, displayed prominently on the profile. The badge is mandatory for visibility to premium recruiters.
- Track interactions received: views, **likes**, recruiter contacts.

### 2.2 Certification questionnaire ("JEB Work Permit")

- **100 questions**, fixed — not subject to UX testing, decided as final.
- Covers work aptitude, motivation, professional values.
- Candidate must complete **all 100 questions in one sitting** — no save/resume. Leaving mid-questionnaire means starting over.
  ⚠️ **Contradicted in §8.4 by Thomas Vignal** — see there before building this.
- A passing score awards the "JEB Work Permit" badge.
- Question content/editing is managed directly by the Minister (JEB), not via an admin editing tool.

### 2.3 Recruiter space

- Access the catalog of job-seeker profiles
- Filter by skills, sector, location, certification status
- Interact with profiles: contact, mark favorites, **like**
- Dashboard tracking contacted candidates

### 2.4 Administration space

- Moderation of profiles and video content. **Hardened by §7.9 (2 Sept): video moderation must be _a priori_ — an admin validation screen with a recorded reason and a trace of who decided and when.**
- Global dashboard (active profiles, certification rate, interactions)
- (Certification questionnaire content is _not_ admin-editable — see §2.2)

---

## 3. The Likes Mechanic (backend logic — do not expose publicly)

**This is a functional requirement, not just a UI feature:**

- A candidate's unemployment benefit amount is to be calculated partly from the number of likes their videos receive.
- Threshold stated by the Minister: under 100 likes per video = no benefits; above 100 = benefits paid.
- This logic must be built into the backend, but must **not** appear in any user-facing communication, UI copy, or public documentation.
- Per the Minister, this is asserted to be legal per the platform's terms and conditions (page 47) — **but this has not actually been confirmed by legal advisor Florine Pontaillac**. Treat as unconfirmed pending her sign-off.

---

## 4. Technical Constraints

### 4.1 Architecture

- Responsive web application (mobile and desktop)
- Backend with relational database
- Documented RESTful API
- Multi-role authentication (job seeker / recruiter / admin)

### 4.2 Video

- Embedding via iframe (YouTube, Vimeo) is accepted
- A video preview must be possible without leaving the profile page
- The feed must **autoplay** on landing (TikTok-style)
- (No file-size cap on direct upload is currently specified.)
- **Constrained by §7.9 (2 Sept):** no video is visible to a recruiter or to the public before validation, and a pending video must be unreachable _by any means_ — not merely hidden in the UI. Read §7.9 before relying on iframe embedding: the two requirements are in tension.

### 4.3 Visual identity — CONFLICTING GUIDANCE

- The Minister's instruction: prioritize looking like TikTok over the ministry's official visual identity — "young, dynamic," not a government site.
- **Overriding note from Benjamin Sellami (added after his review):** the Communications Directorate's style guide is **mandatory** and takes precedence over the above. It will be sent separately.
- **Net effect: follow the mandatory style guide once received.** Confirm with Benjamin Sellami before defaulting to a TikTok-clone aesthetic that may conflict with it.

### 4.4 Performance

- Profile feed must be paginated. **Superseded by §8.3: server-side pagination specifically required, 20 profiles/page — infinite scroll that loads everything into memory will not pass review.**
- No save/resume on the questionnaire (see §2.2 — intentional, framed as testing perseverance). **⚠️ Contradicted by §8.4 — Thomas Vignal requires save/resume and states his written spec is the one that governs.**

---

## 5. Deliverables

### Week 1 — Proof of concept

- Functional profile feed (autoplay videos if possible)
- Job-seeker account creation with video upload/link
- **Complete questionnaire — all 100 questions, not a partial version.** Framed as the heart of the product; expected from week 1.
- Oral presentation: functional demo + product positioning

⚠️ **Deadline note:** the spec header says "Friday project review," but the Minister's annotation explicitly asks to see it **Thursday morning**. Confirm which date actually governs before planning your week.
**Settled in practice on 2 September:** Florine Pontaillac's addendum (§7.9) refers to a public demonstration "tomorrow", i.e. **Thursday 3 September** — so the Thursday demonstration is happening, _and_ the Friday deposits (12:00 legal, 17:00 technical) stand. The exact hour of the Thursday demonstration is still unconfirmed.

### Week 2 — Final version

- All functional spaces (job seeker, recruiter, admin)
- Complete 100-question questionnaire + Work Permit badge
- Integrated likes system: visible counter on the frontend + benefits calculation logic in the backend (kept out of public-facing communication, per §3)
- Admin dashboard
- Technical documentation + project retrospective

---

## 6. Directive from the Minister

JibJob is explicitly intended as a social network, not merely a "skills-showcasing tool." Likes are considered central to the product's scope, not an out-of-scope engagement feature. Plan and build accordingly.

---

## 7. Legal & Compliance Requirements (Florine Pontaillac, Legal Advisor)

Sent separately by email, not part of the original annotated spec. Florine states she cannot issue a favorable opinion on this project without the items below. **These are binding requirements, not suggestions**, and in several places they directly constrain features described above.

### 7.1 Video data / consent (GDPR)

- A presentation video contains a person's image and voice — identifiable personal data. It requires **written, specific, revocable consent**.
- Consent must be **logged**, not just a checkbox: date, time, and the version of the consent text accepted, stored with the profile.
- Revocation must have a **real effect**: the video file must be **deleted**, not just hidden/unlisted from the profile.
- **Proof required**: on a test account, a view of the storage directory before revocation, the same view after, and the profile record in between — showing the file is actually gone.

### 7.2 Non-discrimination (Code du travail, Art. L1132-1)

- French law prohibits selection based on physical appearance, age, origin, or sex. A video-based matching system is structurally exposed to this risk, and nothing in the current spec addresses it.
- **Required deliverable**: a list of every filtering criterion actually exposed in the UI and the API, each with a one-sentence professional justification.
- Any criterion that can't be justified in one sentence should be **removed**, and Florine wants to see which ones were removed, in writing.
- This directly affects §2.3 (recruiter filtering by "skills, sector, location, certification status") — each filter needs a stated justification, and this may also affect any implicit filtering tied to likes/video content.

### 7.3 Minors (16–18 year old job seekers)

- This age group falls under a specific legal regime.
- **Age verification at signup is required.**
- Also required: a two-line explanation of what happens to accounts already created without a birth date — **including the demo/seed accounts** used for the Week 1 profile feed.
- **Superseded and hardened by §7.9.1 (2 Sept)**, which makes this the top priority and adds three things this bullet did not ask for: a declarative birth date with a **strict block under 16**, a **distinct path for 16–18** (adapted information notice, no public video by default), and **exclusion of minors' profiles from the catalogue browsable without a recruiter account**. The under-16 block is **blocking for the Thursday demonstration**.

### 7.4 Accessibility (RGAA level AA)

- Full RGAA audit not required, but **three specific screens must be verified**: the signup flow, the public profile page, the recruiter catalog.
- Requirements for those three screens: full keyboard navigation, permanently visible focus states, and measured contrast ratios for every text/background pair used.
- An accessibility declaration claiming a conformity level that verification doesn't actually support is a personal liability for Florine — she wants an accurate partial declaration over an inflated one.

### 7.5 Subtitles

- Subtitles are an **accessibility obligation, not a nice-to-have**.
- At least one demo video must carry a real subtitle track, actually rendered by the video player (not just present as a file).

### 7.6 Terms of Service (CGU)

- **No CGU/ToS may be published without her office's prior review.** Draft must be sent to her before publication, not after.

### 7.7 Deliverables due — Friday, 12:00

1. **Data processing register** (registre de traitement): one line per processing activity (account, video, questionnaire, recruiter contact, connection log), each with purpose, legal basis, data categories, retention period, recipients, and the **actual corresponding table/field name** in the data model. A sheet that doesn't map to the real model doesn't count.
2. **Accessibility declaration** covering the results for the three screens in §7.4.
3. **Draft CGU/ToS.**
4. **One-page note** on filtering criteria (§7.2).

Florine explicitly says she will read the data-processing register and the draft CGU side by side, and if they describe different data, she needs to know which one is wrong — i.e. these two documents must be consistent with each other and with the real implementation.

### 7.8 Conflicts with existing spec sections to resolve

- **§3 (likes → benefits logic)**: Florine's email doesn't mention this specifically, but it remains **unconfirmed by legal** (per the Minister's own admission in §3) and is exactly the kind of undisclosed, benefit-affecting data use her office would need to review. Flag this to her directly rather than assuming silence means approval.
- **§2.2 (no save/resume on the 100-question questionnaire)**: no legal conflict identified, but combined with §7.3 (minors handling) and §7.1 (consent logging), the questionnaire and signup flow will need the age-check and consent-logging steps built in before question 1, not bolted on after.
- **Demo/seed profiles**: must comply with §7.3 (birth dates) and §7.1 (consent) — can't be exempted just because they're fictitious/demo data.
- **§5 Week 2 ("visible counter on the frontend") vs. §7.9.3**: legal now forbids a public engagement counter on a candidate's public profile, and the ban covers what the server returns, not just what the page paints. The Week 2 deliverable as written can no longer be built. §2.1 ("track interactions received: views, likes"), §2.3 ("interact with profiles: … like") and §6 are constrained the same way — a counter shown to the candidate about their own profile is still allowed.
- **§4.2/§8.5 (iframe embedding preferred) vs. §7.9.2 (a pending video must be unreachable by any means)**: an embedded YouTube/Vimeo link is already public on the host's side. Withholding the URL is the only lever the platform has; it cannot make the host's copy unreachable. These two requirements cannot both be fully satisfied with link embedding — see §7.9.2, this needs an explicit written answer to Florine rather than a silent best effort.

---

### 7.9 Addendum — Florine Pontaillac, email of 2 September, 15:40

Sent after a call with FranceTravail's legal department, ahead of her own announced schedule. These
measures are required **before any public demonstration of the platform, including the Thursday one**.
Florine splits them herself into what blocks that demonstration and what can wait for the Friday 12:00
deposit.

#### 7.9.1 Age verification at signup — _under-16 block is demo-blocking_

- Declarative birth date, **strict block below 16**.
- **Distinct path for 16–18**: adapted information notice, **no public video by default**.
- Two consequences she requires treated at the same time, "without which the measure is worthless":
  - accounts already created without a birth date, **including the demo/seed accounts**;
  - **exclusion of minors' profiles from the catalogue browsable without a recruiter account**.
- Her wording: a signup block that lets the profiles already in the database through protects nobody.

#### 7.9.2 A priori moderation of video content — _pending state is demo-blocking_

- Every deposited video enters a **"pending validation"** state before being visible to a recruiter or
  to the public. A posteriori moderation is judged untenable for a public service: the ministry would
  be responsible for the content from the moment it goes online.
- Required with it:
  - an **admin screen** to validate or refuse, with a **recorded reason** and a trace of **who decided
    and when**;
  - the **refusal reason surfaced to the candidate** in their own space — "a video that disappears
    without explanation is litigation starting";
  - **already-deposited videos flipped to pending**. For those already viewed by a recruiter, she
    explicitly does **not** impose the answer (withdraw / leave / flag) — she requires that one be
    **chosen**;
  - the point she says she will watch most closely: **a pending video must not be reachable by any
    means**, not merely hidden in the interface. **Proof required**: open its direct address in a
    private browsing window and attach the capture. "If the video plays, the measure does not exist."
- ⚠️ This collides with §4.2/§8.5's preference for iframe embedding — see §7.8. For an
  `EXTERNAL_LINK` video the platform controls **disclosure**, not **existence**; that limit has to be
  stated to her in writing rather than papered over.

#### 7.9.3 Removal of public engagement counters — _Friday 12:00_

- The "like" count must **no longer appear on a candidate's public profile**.
- It may be **kept in the database** and shown **to the candidate themselves** in their private space.
- Her reasoning: a public counter constitutes a ranking of people based on popularity, which on an
  employment service exposes her office to a difficulty she will not carry.
- **The removal covers the display _and_ what the server returns**: API responses, exports, recruiter
  views, shared previews. "Data removed from the page but present in the response is still published
  data."
- She will **reconsider if shown in writing** that a public counter serves a legitimate professional
  purpose. She insists on "in writing".
- Note this addendum says nothing about §3 (likes → benefit amount). Her silence there is not
  approval — §7.8's first bullet still stands, and it still has to be put to her directly.

---

## 8. Technical / Infrastructure Requirements (Thomas Vignal, Digital Advisor)

Sent separately by email. Thomas is the technical referent for the project and states these are recette (acceptance-test) criteria — several directly override earlier items in this spec.

### 8.1 API documentation

- **OpenAPI 3.0 spec, with Swagger UI accessible**, required before any deployment.
- Must document the three main routes **including error responses**: 400, 401, 403, 404, 422, with the actual response body returned — not just the happy path.
- **Proof required**: output of three curl calls that actually produce these errors, attached.

### 8.2 Database & environment

- **Database schema** (logical model, cardinalities, indexes) due **Friday 17:00**, and it must match the actual migrations, not just the intent.
- **Complete `.env.example`**; no secrets hardcoded in the repo.
- **`/health` endpoint** that checks something real: deployed version + database connection status. Must return **503** if the database is unreachable.
  - **Proof required**: screenshot/capture of both the healthy (200) and degraded (503) responses — cut the DB connection and show it.

### 8.3 Deployment — digital sovereignty constraint

- The Ministry will **not** open a cloud provider account for this demonstrator — no hosting cost, no contract to sign, on their side.
- **Hard constraint**: no dependency on any paid third-party service or any service requiring a proprietary account to run the app. This explicitly rules out: managed object storage, hosted/managed databases, mapping APIs, commercial auth providers, commercial email-sending services.
- **"Cloud de confiance" doctrine explicitly excludes AWS, GCP, and Azure.** (Thomas notes he didn't write this rule, but confirms it applies.)
- **The application must run entirely locally**, on any machine that clones the repo, using only the provided install instructions. This is his sole acceptance criterion on this point.
- **Deliverable**: a one-page deployment note — where this would be hosted in production, what resources it would require, what data would leave the infrastructure and to whom. This note goes to the Direction; it is not an invoice/cost estimate.
- **Practical impact**: video storage, DB, and any external APIs used must be self-hostable / open-source / running locally — no managed video CDN, no third-party auth-as-a-service, etc.

### 8.4 Certification questionnaire — save/resume required

- **Progress saving is a technical requirement, not optional.** A long questionnaire with no resume capability produces high abandonment and orphaned sessions in the database.
- Thomas is explicit that he is aware the Minister holds the opposite view (see §2.2/§4.4), and states: **his is the version written into the cahier des charges, and that is the version he will review against.** This is an open conflict between him and the Minister — get it resolved explicitly before building either version.
- Two specifics if save/resume is implemented:
  - Resume must survive both a browser close **and a server restart** — i.e., persisted server-side/in the database, not browser local storage.
  - **Written answer required** on what happens to in-progress responses if the questionnaire content changes mid-session (keep answers / invalidate them / let the candidate finish on the old version). Pick one, implement it, justify it in three lines.

### 8.5 Video (server-side enforcement)

- Prefer link embedding (YouTube/Vimeo iframe) for the demonstrator, consistent with §4.2.
- If direct upload is implemented:
  - **100 MB max per file**, enforced **server-side**, not just via the form's `accept` attribute.
  - **Real file-type verification** based on file content, not file extension.
  - Uploaded files must **not** be served from the same directory as the application code.
  - **Proof required**: demonstrate both rejection cases — an oversized file, and a file renamed to `.mp4` that isn't actually a video — showing the status code and the message the user sees.
- **Decide and document** what happens to an interrupted upload: partial file on disk, orphaned DB row, or nothing at all. Any of the three is acceptable — having no defined behavior is not.

### 8.6 Feed / pagination

- **Server-side pagination required**, 20 profiles per page. An infinite scroll that loads everything into memory will not pass review.
- Response must include total count, current page, and page size. An out-of-range page must respond cleanly, not error/crash.
- **No simultaneous autoplay of multiple video streams** — only one active player at a time (this refines the Minister's "autoplay like TikTok" requirement from §4.2 — autoplay applies to the single active/focused video only).

### 8.7 Load testing

- Documented load tests will be required before next week's technical review. Scope to be provided later — flag as an upcoming deliverable, not yet specified.

### 8.8 Conflicts with existing spec sections to resolve

- **Questionnaire save/resume** (§2.2, §4.4 vs. §8.4): direct contradiction between the Minister and Thomas Vignal. Thomas states explicitly he will review against his own written version. Needs resolution before implementation — building the wrong one wastes real work either way.
- **Video upload size** (§4.2 previously noted as "no cap currently specified" vs. §8.5): the 100 MB cap is back, now with explicit server-side and content-based enforcement requirements.
