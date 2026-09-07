# Video consent revocation

The demonstration asked for on 7 September — a view of the storage directory
before revocation, the same after, and the profile page in between — can now be
produced, and has been: `docs/preuves/AD-7-sous-titres-et-revocation.txt`, with
the screen captures alongside it in
`docs/preuves/AD-7-sous-titres-et-revocation/`.

## Why it could not be produced before

The demonstration set had no file in it. Every video was a YouTube embed, and an
embed has nothing stored on our side: the row points at a third party's player,
so there is no directory entry to show disappearing. The honest answer to "show
me the file being deleted" was "there is no file", which answers a different
question from the one asked.

The demonstration set now contains one video **ProfilsActifs hosts itself** —
Leïla Sassi's presentation, the same one carrying the caption track. It exists so
that the deletion has something to delete in front of a witness.

## What revocation does

`DELETE /videos/{videoId}`, the route the candidate's own profile page calls, is
handled by `deleteVideo` in `packages/api/src/services/video.service.ts`. In
order: ownership is checked, the `Video` row is deleted, and then — for a video
we host — the video file and its caption track are removed from disk through a
`VideoProvider` (`packages/api/src/services/video-provider.ts`), specifically
the one this row was actually stored through (`Video.providerName`), not
whichever provider is configured today — the two can differ if that
configuration changed since the video was uploaded, and only the row's own
value is guaranteed to point at where the bytes really are. The caption track
goes with the video because it is a transcript of what the candidate said:
it is part of what consent covered, and leaving it behind would leave their words
in the storage directory after they asked for them to go.

A row written before `providerName` existed (or one the backfill script below
hasn't reached yet) falls back to whichever provider is configured today —
today that's still the only provider capable of actually storing a file, so
deletion still removes the bytes; a warning is logged so the gap is visible
rather than silent.

Measured, in that transcript: `ls -la` before shows the `.mp4` and the `.fr.vtt`;
the route answers `204`; `ls -la` after shows an empty directory; the public
profile page shows the video, then does not.

## Two things this deliberately does not do

**There is no `revokedAt` column.** A field that can only ever be written on the
row being removed is a field that stays empty. Revocation is a deletion, and the
evidence that it happened is the absence of the row and of the files, not a flag
on a record that no longer exists. The column existed until 7 September and was
never written to by anything; it was dropped by migration
`20260907092851_video_captions_drop_revoked_at`.

**There is one revocation path, not two.** A `revokeVideoConsent` helper used to
sit in `services/video-consent.ts`; nothing called it, it deleted the row without
touching the files, and this note used to describe it as the live code. That is
precisely the drift a second entry point invites, so it is gone. Consent
revocation and video deletion are the same operation because they are the same
act.

## What revocation cannot reach

For a YouTube or Vimeo video, revoking consent removes the association and the
row, and the video stops appearing anywhere on the platform for anyone. **It does
not delete the file from the third-party platform**, which remains under the
candidate's own control through that platform's own account. The consent text
(`docs/legal/consent-text-v1.md`) says so in those terms, so that no one is led
to believe otherwise. This is one of the reasons the iframe route is on record as
a point for your arbitration (processing register, §5).

## Reproducing it

```bash
docker compose up -d
npm run db:migrate && npm run db:seed
npm run db:migrate-video-providers -w @profils-actifs/db
npm run dev -w @profils-actifs/api
npm run dev -w @profils-actifs/web
npx tsx scripts/preuves/sous-titres-et-revocation.mts
```

`npm run db:migrate-video-providers` backfills `providerName`/`providerRef` for
the fixtures `db:seed` just wrote (it creates `Video` rows directly, bypassing
the API, so they start without one — see `packages/db/src/migrate-video-
providers.ts`). Skipping it doesn't break the demonstration — deletion still
removes the file via the fallback described above — but it does mean the run
exercises that fallback instead of the normal path, with a warning in the API's
logs to show it.

The run deletes the fixture it demonstrates on. `npm run db:seed` puts it back
— followed by `npm run db:migrate-video-providers -w @profils-actifs/db` again,
for the same reason.
