# Note — vidéo : intégration par lien uniquement, pas de dépôt direct

**Destinataire** Thomas Vignal, conseiller au numérique
**Référence** JEB/DNI/2026-003 §8.5 · **Tâche** VI-8
**Échéance** vendredi 4 septembre 2026, 17h00
**Rédacteur** Victor — domaine B (profils & vidéo)

---

## Ce que ce document répond

Le §8.5 pose quatre exigences de recette pour le dépôt vidéo direct
(`type: UPLOAD`) : plafond de taille, vérification du type de fichier par le
contenu, séparation du répertoire de stockage, et comportement documenté en
cas d'envoi interrompu. Le produit livré n'expose que l'intégration par lien
(`type: EXTERNAL_LINK`, iframe YouTube/Vimeo) : `POST
/profiles/{id}/videos` répond **501 `not_implemented`** pour `type:
'UPLOAD'` (`packages/api/src/controllers/video.controller.ts:23-27`).

Chacun des quatre points du §8.5 est traité ci-dessous explicitement, y
compris quand la réponse est « non applicable » — le silence ne vaut pas
réponse.

## Pourquoi le dépôt direct n'est pas exposé

Le §4.2 et le §8.5 eux-mêmes autorisent à préférer l'intégration par lien, et
le §8.3 (souveraineté numérique) exclut tout stockage d'objet géré : un
dépôt direct auto-hébergé demande du stockage, de la bande passante, du
transcodage et un lecteur, que le calendrier de deux semaines ne permet pas
de construire proprement à ce stade. Ce choix a un coût inverse — décrit
dans `docs/livrables/note-de-deploiement.md` §3.1 — que ce document ne
reprend pas : l'intégration par lien envoie l'image et la voix du candidat,
et la connexion de chaque visiteur, chez un hébergeur tiers.

---

## 1. Plafond de taille (§8.5 — 100 Mo)

**Non exercé.** Le contrôle est écrit ; aucune route ne peut encore
l'atteindre.

`assertUploadSizeWithinLimit`
(`packages/api/src/services/video-providers/local.ts:43-48`) compare la taille
réelle du buffer reçu — jamais une taille déclarée par le client — à
`env.MAX_VIDEO_SIZE` (`packages/api/src/config/env.ts:42-46`, 100 Mo par
défaut, configurable par variable d'environnement) et lève une erreur au
dépassement. La fonction existe et peut être testée en isolation, mais
`addVideo` refuse `type: 'UPLOAD'` avant de l'atteindre
(`video.controller.ts:23-27`) : il n'y a pas de requête HTTP réelle contre
laquelle produire la preuve demandée par le §8.5.

## 2. Vérification du type de fichier par le contenu (§8.5)

**Non exercée, même raison.**

`detectVideoContentType`
(`packages/api/src/services/video-providers/local.ts:60-69`) lit les octets de
tête du fichier (marqueur `ftyp` des conteneurs ISO, magie EBML de Matroska)
plutôt que l'extension du nom de fichier ou le `Content-Type` déclaré par le
client, et renvoie `null` pour tout ce qu'elle ne reconnaît pas —
`addUploadedVideo` refuse alors l'envoi avec un message qui dit
explicitement que renommer un fichier ne change pas son contenu. Écrite,
non branchée à une route.

## 3. Répertoire de stockage (§8.5, `UPLOAD_DIR`)

**Aucun fichier stocké — situation attendue, pas un manque.**

`UPLOAD_DIR` (`packages/api/src/config/env.ts:49`) et
`assertUploadDirOutsideAppCode`
(`packages/api/src/services/video-providers/local.ts:78-80`) existent et refusent
au démarrage un répertoire qui résoudrait à l'intérieur du dépôt applicatif
— mais tant qu'aucune route n'écrit de fichier, ce répertoire reste vide en
permanence. C'est la conséquence directe du choix embed-only : une vidéo
intégrée par lien ne quitte jamais l'hébergeur tiers, il n'y a rien à
stocker localement.

## 4. Envoi interrompu (§8.5)

**Non applicable — il n'existe pas de chemin d'upload à interrompre.**

Le comportement est néanmoins écrit dans le code, prêt pour le jour où une
route l'exercera : `addUploadedVideo`
(`packages/api/src/services/video.service.ts:145-188`) écrit le fichier via
le `VideoProvider` local (voir l'addendum ci-dessous) plutôt qu'un accès
disque direct, avant la ligne en base — un enregistrement qui pointerait un
fichier jamais écrit serait une vidéo cassée à l'affichage, alors qu'un
fichier orphelin reste invisible tant qu'il n'est pas balayé — et retire le
fichier (`provider.delete()`) si l'insertion échoue ensuite. Une décision
prise et documentée par avance, mais qui n'a encore jamais tourné contre un
vrai envoi.

---

## Addendum — 7 septembre 2026 (revue de sécurité, mail de Thomas Vignal)

Suite à la revue de sécurité de ce matin, le stockage vidéo passe derrière
une interface `VideoProvider` (`store`/`status`/`playbackUrl`/`delete`,
`packages/api/src/services/video-provider.ts`) : ce que les quatre sections
ci-dessus décrivaient comme des accès disque directs dans
`video.service.ts` vit maintenant dans l'implémentation locale de cette
interface (`packages/api/src/services/video-providers/local.ts`), sélectionnée
par `VIDEO_PROVIDER=local` (valeur par défaut). Les fonctions citées plus
haut n'ont pas changé de comportement, seulement d'emplacement — les
références de fichier/ligne ci-dessus sont déjà à jour. Le fond de ce
document reste valable : `type: UPLOAD` répond toujours 501, aucun des
quatre points du §8.5 n'est encore exercé par une requête HTTP réelle.

Deux fournisseurs supplémentaires existent derrière la même interface :
`ministry-placeholder` (le futur PeerTube ministériel, non fonctionnel par
construction — `status()` répond toujours `'unavailable'`) et
`external-link` (YouTube/Vimeo, la voie déjà en production). Le détail de
cette abstraction — pourquoi, migration, preuve contre les deux
implémentations — est un chantier séparé, pas ré-exposé ici.

## Quand ce document devient obsolète

Ce document répond pour l'état actuel du produit : dépôt direct non exposé.
Si un ticket futur branche une route multipart sur `addUploadedVideo`,
chacune des quatre sections ci-dessus doit être réécrite avec une preuve
exercée (capture, code de retour, essai réel contre l'API) — « non exercé »
cesse d'être une réponse valable dès que le chemin existe.

---

## Addendum — 10 septembre 2026 (le chemin existe désormais)

Le corps du document ci-dessus décrit l'état du produit jusqu'au
9 septembre inclus et n'est pas réécrit — il reste la trace de ce qui a été
livré et pourquoi, pendant la période où c'était vrai. À partir d'aujourd'hui,
`POST /profiles/{id}/videos` accepte `type: 'UPLOAD'` en
`multipart/form-data` : `middleware/video-upload.ts` (multer, stockage
mémoire) parse le corps et alimente `addUploadedVideo`, qui n'a pas changé de
comportement. Les quatre points du §8.5 ont chacun une preuve exercée,
contre l'API réelle plutôt qu'en isolation :

**1. Plafond de taille (100 Mo).** `packages/api/test/video-upload.test.ts`
— *« refuses a file over MAX_VIDEO_SIZE with 413, at the HTTP boundary »* —
envoie un corps de `env.MAX_VIDEO_SIZE + 1` octets et observe un vrai
`413 payload_too_large` en retour HTTP. multer applique sa propre limite
(`limits.fileSize`, configurée sur `env.MAX_VIDEO_SIZE`) avant que
`assertUploadSizeWithinLimit` ne s'exécute ; `packages/api/test/error-
handler.test.ts` couvre séparément la traduction de l'erreur multer
(`MulterError` → `413`/`400`, selon le code) dans `middleware/error-
handler.ts`.

**2. Vérification du type de fichier par le contenu.**
`video-upload.test.ts` — *« refuses a file whose content isn't a recognized
video format, by its bytes »* — envoie un fichier nommé et déclaré `.mp4`
dont le contenu réel est du texte brut, et observe `422
unprocessable_entity`. `detectVideoContentType` n'a pas changé ; ce qui est
nouveau est la preuve qu'une route HTTP l'atteint réellement.

**3. Répertoire de stockage (`UPLOAD_DIR`).** Le même fichier de test — le
test « stores a real upload to disk and serves it back under /uploads/ » —
envoie un `.mp4` valide, vérifie que la réponse est `201`, que le fichier
existe réellement sur disque à l'emplacement attendu
(`existsSync(absolutePath)`), et qu'un `GET` sur l'URL retournée répond
`200` (servi par le montage statique de `app.ts`). Vérifié aussi à la main,
navigateur réel : capture disponible sur demande, séquence connexion →
dépôt d'un fichier `.mp4` réel → lecture via l'élément vidéo HTML natif →
suppression → fichier disparu du disque, contre une instance isolée de
l'API et du frontend (aucune donnée de démonstration modifiée).

**4. Envoi interrompu.** Toujours non applicable au sens strict — aucun
test ne coupe une connexion en cours d'envoi — mais le comportement en cas
d'échec après stockage *est* désormais exercé : `video-upload.test.ts`
supprime la vidéo déposée via `DELETE /videos/{id}` et vérifie que le
fichier disparaît du disque, et `packages/api/test/services/
video.service.test.ts` (préexistant) couvre le cas symétrique — une ligne
en base qui prédate la migration V2. Le cas précis « l'écriture disque
réussit, l'insertion en base échoue ensuite » (`addUploadedVideo`'s
`catch`/`provider.delete()`) reste non exercé par un test automatisé : le
provoquer proprement contre la base partagée de la suite d'intégration
exigerait une panne construite plutôt qu'un scénario réaliste, et n'a pas
été jugé proportionné pour cette clôture.

Aucun des choix documentés plus haut (embed-only par défaut, `VideoProvider`
en abstraction, refus d'un stockage objet géré) n'a changé : ce qui change
est que le chemin `UPLOAD`, déjà écrit, est maintenant celui qui répond.
