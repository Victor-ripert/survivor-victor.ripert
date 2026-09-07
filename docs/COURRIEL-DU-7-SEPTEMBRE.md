# Courriel Florine Pontaillac du 7 septembre — ce qui manque

**Destinataires** les quatre domaines · **Référence** JEB/DNI/2026-003 · courriel du lundi 7 septembre 2026
**Échéance imposée** vendredi 11 septembre 2026, 12h00
**Relevé le** lundi 7 septembre 2026 · **Corrigé et vérifié le** même jour sur
`origin/main` (`ba68234`) · **Rédacteur** Ewan — domaine D

> Le premier relevé a été fait sur un `main` local en retard de sept commits.
> Ce qu'il a manqué de ce fait est au §7.

Ce document est un relevé d'écarts, pas un plan de rédaction. Chaque entrée
nomme ce que la conseillère juridique demande, ce que le dépôt contient
réellement aujourd'hui (fichier et ligne, vérifiés), ce qui manque, et de quoi
la refermer. Une entrée qui dit « c'est fait » dit aussi où le lire.

**Ce qui n'est pas dans ce document.** Le mécanisme d'allocation adossé aux
« likes » du brief JibJob (`brief_jibjob_en.pdf`, §2.1 et §5) n'y figure pas :
il n'est pas implémenté, il ne doit pas l'être, et notre position est écrite
dans `docs/remontees/01-allocation-et-likes.md`. Le courriel du 7 septembre ne
le mentionne pas — ce silence n'est pas un accord, et le §5 du registre le
remet explicitement à son arbitrage.

---

## État au 7 septembre, fin de journée

Quatre entrées sont refermées et vérifiées : **FP-1** (sous-titres), **FP-3**
(révocation), **FP-8** (audit clavier) et **FP-14** (le §4 périmé du registre).
Ce qui les referme est reproductible, pas déclaratif :

| Preuve                                            | Ce qu'elle établit                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `docs/preuves/AD-7-sous-titres-et-revocation.txt` | Piste de sous-titres réelle affichée par notre lecteur ; `ls -la` avant / fiche / `ls -la` après |
| `docs/preuves/AD-6-clavier-trois-ecrans.txt`      | Parcours clavier réellement exécuté sur les trois écrans, anneau de focus lu en style calculé    |
| `scripts/preuves/sous-titres-et-revocation.mts`   | Le script qui produit la première, re-jouable                                                    |
| `scripts/preuves/clavier-trois-ecrans.mts`        | Le script qui produit la seconde, re-jouable                                                     |

**Un défaut d'accessibilité réel a été trouvé et corrigé au passage** : activer
une vidéo au clavier faisait perdre le focus, renvoyant le lecteur en haut du
document (WCAG 2.4.3). La déclaration annonçait cet écran conforme. Voir FP-8.

**FP-4 (vidéos tierces) reste ouverte et connue** — elle sera traitée
séparément. La vidéo de démonstration sous-titrée, elle, est produite par nous
et ne dépend d'aucun tiers.

Le reste — FP-5, FP-7, FP-9, FP-10, FP-12, FP-15, FP-16 — est inchangé et reste
dû vendredi.

## Les quatre pièces exigées vendredi 12h00

| Pièce                             | Fichier                                       | État                                                                                                       |
| --------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Registre de traitement            | `docs/livrables/registre-de-traitement.md`    | **§4 réécrit et re-daté** (FP-14) ; reste le journal de connexion à annoncer en clair (FP-15)              |
| Déclaration d'accessibilité       | `docs/legal/accessibility-declaration.md`     | **Adossée à une vérification réelle** (FP-8) ; restent deux trous obligatoires (FP-9) et l'anglais (FP-10) |
| Projet de CGU                     | `docs/legal/cgu-draft.md`                     | Rédigé, **un trou** et en anglais (FP-12)                                                                  |
| Note sur les critères de filtrage | `docs/livrables/note-criteres-de-filtrage.md` | Rédigée, **périmée sur un point** (FP-5)                                                                   |

Les quatre existent. Aucune n'est encore envoyable : il reste les deux sections
obligatoires de la déclaration (FP-9), la traduction (FP-10, FP-12), et deux
reprises de documents (FP-5, FP-15).

## Ordre de traitement

**Fait le 7 septembre** — FP-1, FP-3, FP-8, FP-14, et les quatre écarts
d'exécution trouvés en chemin (FP-17 à FP-20). C'étaient les deux exigences que
le courriel annonce vouloir **regarder elle-même** (« Je regarderai celle-là »,
« Je vous demanderai de me le démontrer »), l'audit qui portait la déclaration,
et la seule contre-vérité du registre.

**À faire dès demain matin, avant tout le reste** — FP-9 : les deux sections
obligatoires de la déclaration doivent lui être demandées par courriel séparé.
Demandées vendredi, la réponse arrivera après l'échéance, et la déclaration ne
peut pas partir avec deux crochets.

**Ensuite** — FP-4 (les vidéos tierces du jeu de démonstration), qui reste le
dernier point vidéo ouvert. La vidéo sous-titrée qu'elle regardera est à nous ;
les neuf autres sont des clips commerciaux sous des titres de candidats.

**Enfin** — FP-5, FP-7, FP-10, FP-12, FP-15, FP-16 : correction, traduction et
re-datation des documents existants, plus les arbitrages à remettre dans le
courriel d'accompagnement. Une demi-journée à quatre.

**Hors échéance, à planifier** — FP-2 (souhaitable si le temps le permet),
FP-6, FP-11, FP-13, FP-21.

---

## 1. Vidéo, consentement, révocation

### FP-1 — Sous-titres · domaine B · ✅ refermé le 7 septembre

> **Refermé.** Une vidéo du jeu de démonstration est désormais hébergée par
> ProfilsActifs et porte une piste WebVTT française affichée par notre propre
> lecteur, sans action du spectateur. Vérifié dans la page — piste chargée,
> `mode: showing`, cue attendue à l'écran — et pas seulement photographié :
> `docs/preuves/AD-7-sous-titres-et-revocation.txt`. La phrase de
> `ProfilePage.tsx` dit maintenant ce que le code fait, et distingue le cas
> d'une vidéo intégrée. Le diagnostic d'origine est conservé ci-dessous.

**Demandé.** « Les sous-titres sont une obligation d'accessibilité, pas une
option de confort. Au moins une vidéo de votre jeu de démonstration doit porter
une piste de sous-titres réelle, affichée par votre lecteur. Je regarderai
celle-là. »

**État réel.** Rien de ce qui existe ne satisfait cette phrase.

- `packages/web/src/utils/embed.ts:56-66` ajoute `cc_load_policy=1` et
  `cc_lang_pref=fr` aux URL YouTube, `texttrack=fr` aux URL Vimeo. C'est une
  **demande adressée au lecteur tiers** d'afficher une piste _si la vidéo en
  porte une_. Ce n'est pas une piste, et nous ne contrôlons pas la réponse.
- La branche `UPLOAD` du lecteur — `packages/web/src/components/VideoPlayer.tsx:49-57` —
  est un `<video>` **sans aucun élément `<track>`**. Une vidéo déposée sur le
  serveur ne peut techniquement pas porter de sous-titres aujourd'hui.
- Aucun champ du modèle ne stocke de piste : `grep -riE "caption|subtitle|\.vtt|<track"`
  sur `packages/*/src` et `packages/db` ne renvoie que des classes CSS
  `panel__subtitle` et `page-header__subtitle`.
- **`packages/web/src/pages/Profile/ProfilePage.tsx:106` affiche au visiteur
  « Le lecteur n'est chargé qu'au clic. Les sous-titres sont activés par
  défaut. »** C'est la phrase la plus dangereuse du dépôt sur ce dossier : elle
  annonce au public une conformité que le code ne soutient pas, sur la
  fonctionnalité précise que la conseillère annonce venir regarder.

**Travail à faire.**

1. Corriger ou retirer la phrase de `ProfilePage.tsx:106` **aujourd'hui**,
   indépendamment du reste. Tant que la piste n'existe pas, la formulation
   exacte doit être « le lecteur demande l'affichage des sous-titres lorsque la
   vidéo en propose », ou rien.
2. Choisir le porteur de la piste. Deux voies, à trancher explicitement :
   - **Voie iframe** — publier une vidéo de démonstration sur une chaîne
     contrôlée par l'équipe, y déposer une vraie piste de sous-titres, et la
     substituer dans le jeu de démonstration. Le moins de code, mais la piste
     vit chez un tiers et dépend de son lecteur.
   - **Voie fichier** — ajouter `<track kind="captions" srcLang="fr" default>`
     à la branche `UPLOAD` de `VideoPlayer.tsx`, un champ `captionsUrl` sur
     `Video` (migration Prisma), le service qui le sert, et une vidéo déposée
     dans le jeu de démonstration. Plus de code, mais la piste est à nous, et
     elle referme FP-3 par la même occasion — la voie fichier est la seule qui
     produise aussi un fichier à supprimer devant témoin.
   - **Recommandation : la voie fichier.** Elle est la seule qui satisfasse
     FP-1 _et_ FP-3, et elle est déjà à moitié écrite (`addUploadedVideo`,
     `removeUploadedFile` existent, cf. FP-3).
3. Nommer la vidéo dans la note d'accompagnement : « la vidéo à regarder est
   celle du profil X ». Elle a annoncé qu'elle en regarderait une ; lui laisser
   choisir laquelle est un risque inutile.

**Fait quand.** Un lecteur ouvert sur la vidéo nommée affiche des sous-titres
en français sans action du spectateur, capture d'écran dans `docs/preuves/`, et
la phrase de `ProfilePage.tsx` décrit ce qui se passe réellement.

---

### FP-2 — Le consentement est enregistré mais nulle part visible · domaine B

**Demandé.** « Il conviendrait donc que le consentement soit enregistré et non
simplement coché : date, heure, et version du texte accepté, conservées avec le
profil. »

**État réel — la moitié est faite, et bien faite.**

- `packages/db/prisma/schema.prisma:174-175` porte `acceptedAt DateTime` et
  `consentTextVersion String`, tous deux **non nullables** : une vidéo ne peut
  pas exister sans consentement journalisé.
- `packages/api/src/services/video-consent.ts` (`buildVideoConsent`) est étalé
  dans le même `prisma.video.create()` que la vidéo — écriture atomique, pas un
  second appel qui pourrait échouer.
- `packages/api/src/validators/video.ts` exige `consentAccepted: z.literal(true)` :
  une case non cochée est une erreur de validation, pas un défaut.
- Le texte accepté est versionné et archivé : `docs/legal/consent-text-v1.md`,
  `CONSENT_TEXT_VERSION` dans `@profils-actifs/shared`.

**Ce qui manque.** Les deux champs ne sortent jamais de la base.
`toVideoDto` (`packages/api/src/utils/mappers.ts:57-69`) ne les projette pas, le
schéma `Video` de `packages/api/openapi.yaml` ne les déclare pas, et aucune page
ne les affiche. Conséquence concrète : **ni le candidat, ni l'administrateur, ni
la conseillère ne peuvent lire ce qui a été accepté et quand, autrement qu'en
ouvrant `npm run db:studio`.** Un consentement qu'on ne peut pas produire sur
demande est difficile à opposer.

**Travail à faire.**

1. Ajouter `acceptedAt` et `consentTextVersion` au schéma `Video` de
   `openapi.yaml` — **dans le même changement que le code**, c'est la règle du
   dépôt.
2. Les projeter dans `toVideoDto`, et les typer dans
   `packages/shared/src/types/video.ts`.
3. Les exposer sur deux surfaces seulement : la vue propriétaire
   (`/mon-profil`, `VideosSection.tsx`) et la file de modération administrateur
   (`VideoModerationPage.tsx`). Pas sur la fiche publique ni sur le catalogue
   recruteur : la date à laquelle quelqu'un a consenti n'est pas une
   information dont un recruteur a besoin.
4. Sur `/mon-profil`, afficher un lien vers le texte de la version acceptée, pas
   seulement son numéro.

**Fait quand.** Un candidat connecté voit, sous chacune de ses vidéos, la date,
l'heure et la version du texte qu'il a acceptés, et peut relire ce texte.

---

### FP-3 — Révocation · domaine B · ✅ refermé le 7 septembre

> **Refermé.** La démonstration demandée est produite, dans l'ordre demandé :
> `ls -la` du répertoire de stockage, la fiche publique portant la vidéo, la
> suppression par la route réelle `DELETE /videos/{id}` authentifiée comme la
> candidate (HTTP 204), `ls -la` à nouveau — répertoire vide — et la fiche sans
> vidéo. La piste de sous-titres part avec le fichier.
> `docs/preuves/AD-7-sous-titres-et-revocation.txt`. Les deux dettes signalées
> plus bas sont soldées : `revokeVideoConsent` est supprimé et `Video.revokedAt`
> aussi, par la migration `20260907092851`. Diagnostic d'origine conservé.

**Demandé.** « La révocation doit produire un effet réel, c'est-à-dire la
suppression du fichier, pas le masquage de la fiche. Je vous demanderai de me le
démontrer : sur un compte d'essai, une vue de votre répertoire de stockage avant
révocation, la même après, et la fiche du profil entre les deux. »

**État réel.** Trois constats, dans cet ordre.

1. **La révocation supprime réellement.** `packages/api/src/services/video.service.ts`
   (`deleteVideo`) supprime la ligne `Video` puis, si `type === UPLOAD`, appelle
   `removeUploadedFile`, qui `unlink` le fichier. Ce n'est pas un masquage.
2. **Mais aucun fichier n'existe.** Le dépôt direct répond `501` :
   `packages/api/src/controllers/video.controller.ts:24` lève `notImplemented`,
   parce qu'aucune route ne lit de corps multipart. `addUploadedVideo` et
   `removeUploadedFile` sont écrits et testables, mais **inatteignables depuis
   l'application**. Le jeu de démonstration compte 0 vidéo déposée
   (`docs/livrables/recensement-du-3-septembre.md`, ligne « déposées directement
   sur le serveur »).
3. **La réponse écrite existe déjà mais elle est incomplète.**
   `docs/legal/video-consent-revocation.md` explique — correctement — qu'un
   embed iframe n'a pas de fichier, donc pas de répertoire à comparer. Ce qu'elle
   ne fait pas : **produire la preuve de substitution qu'elle annonce**. Aucun
   fichier de `docs/preuves/` ne porte sur la révocation.

**Deux dettes techniques à refermer dans le même passage.**

- `revokeVideoConsent` (`video-consent.ts:29`) **n'est appelé par personne** :
  `grep -rn "revokeVideoConsent" packages --include="*.ts"` ne renvoie que sa
  propre définition et le `.d.ts` compilé. La route `DELETE /videos/:videoId`
  passe par `videoService.deleteVideo`. Deux implémentations de la révocation,
  dont une morte — à supprimer, ou à faire appeler par l'autre.
- `Video.revokedAt` (`schema.prisma:176`) **n'est jamais écrit ni lu** :
  `grep -rn "revokedAt"` ne le trouve que dans le schéma et dans le type de
  retour de la fonction morte ci-dessus. Une colonne « date de révocation » qui
  reste vide sur une base qu'une conseillère juridique va peut-être regarder est
  pire que pas de colonne. À supprimer par migration, ou à remplir — mais on ne
  peut pas la remplir sur une ligne qu'on efface, donc : à supprimer.

**Travail à faire — deux voies, à trancher.**

- **Voie A, recommandée : rendre la démonstration littéralement possible.**
  Écrire la route multipart qui manque (le service est déjà là), déposer une
  vidéo réelle dans le jeu de démonstration, et produire les trois pièces
  demandées : `ls -la $UPLOAD_DIR` avant, capture de la fiche profil montrant la
  vidéo, `ls -la $UPLOAD_DIR` après, capture de la fiche sans la vidéo. C'est
  aussi ce qui referme FP-1 par la voie fichier. Chiffrer honnêtement : une
  route multipart, un test d'intégration, une fixture de seed.
- **Voie B : répondre par écrit et prouver l'équivalent.** Envoyer
  `video-consent-revocation.md` (traduit, cf. FP-9) **et** produire la preuve de
  substitution qu'elle annonce : état de la ligne `Video` avant et après, plus
  les deux captures de la fiche profil. Moins de code, mais elle répond à côté
  de la question posée, et il faudra le dire franchement.

Dans les deux cas, corriger la note pour qu'elle décrive le code réel : elle
attribue la révocation à `revokeVideoConsent`, qui n'est pas la fonction qui
tourne.

**Fait quand.** Trois pièces datées dans `docs/preuves/`, référencées depuis la
note, et une phrase de la note qui dit laquelle des deux voies a été retenue et
pourquoi.

---

### FP-4 — Le jeu de démonstration embarque des vidéos tierces · domaine B

**État réel.** `packages/db/src/seed-data/applicants.ts` intègre dix vidéos
YouTube par identifiant. Ce sont des clips musicaux commerciaux connus —
`dQw4w9WgXcQ`, `kJQP7kiw5Fk`, `9bZkp7q19f0`, `RgKAFK5djSk`, `CevxZvSJLk8`,
`e-ORhEE9VVg` — présentés sous des titres comme « Présentation en 90 secondes »
ou « Mon premier fournil ».

**Pourquoi c'est dans cette liste.** Trois raisons, par ordre de gravité :
la conseillère annonce qu'elle va **en regarder une** ; le contenu ne correspond
à aucun titre affiché, ce qui décrédibilise toute la démonstration ; et aucune
de ces vidéos ne peut porter la piste de sous-titres de FP-1.

**Travail à faire.** Substituer des vidéos dont l'usage est licite et le contenu
cohérent — vidéos libres de droits, ou tournées par l'équipe. Au minimum, la
vidéo nommée en FP-1 doit être maîtrisée de bout en bout.

---

## 2. Non-discrimination

### FP-5 — La note sur les critères est bonne mais périmée en deux points · domaine D

**Demandé.** « La liste des critères de filtrage effectivement exposés par votre
interface et par votre API, un par un, chacun assorti de sa justification
professionnelle en une phrase. […] je préférerais lire dans votre note ceux que
vous avez retirés. »

**État réel — cette pièce est la plus avancée des quatre.**
`docs/livrables/note-criteres-de-filtrage.md` (146 lignes) fait exactement ce
qui est demandé : neuf critères conservés avec une phrase de justification
chacun (§1), les critères retirés avec la date et le raisonnement (§2.1 — le nom
et le prénom, retirés de la recherche libre le 2 septembre), ce qui n'a jamais
été exposé (§2.2), et trois réserves posées à son arbitrage (§3).

**Ce qui manque.**

1. **Une ligne du §2.2 est fausse depuis le 2 septembre.** Le tableau porte
   « Date de naissance / âge — à venir, migration AD-1 (§7.3) ». La migration
   `20260902093737_add_user_birth_date` est appliquée ; `User.birthDate` existe.
   La justification (« l'âge n'est pas un critère de sélection ») reste juste et
   reste vraie dans le code — `birthDate` n'apparaît dans aucun DTO recruteur
   (vérifié : `toProfileDto` ne le projette pas, et
   `packages/shared/src/types/user.ts:25` le porte sur `User`, jamais sur
   `Profile`) — mais l'emplacement annoncé est faux. **Une note qui ne renvoie
   pas au modèle réel est un exercice de style : c'est sa phrase.**
2. **L'en-tête porte l'échéance du 4 septembre et la tâche EW-8.** À re-dater
   pour le 11.
3. **Le courriel demande les critères de l'interface _et_ de l'API ; la note
   relève l'API.** Elle affirme que les trois sources (validateur, service de
   filtres, contrat) concordent — c'est vrai — mais elle ne dit pas
   explicitement que `packages/web/src/pages/Recruiter/CatalogueFilters.tsx`
   n'expose rien de plus ni d'autre. À vérifier contrôle par contrôle et à
   écrire en une phrase.
4. **Les deux questions du §3 n'ont jamais reçu de réponse** — `minScore` /
   `sort=score` au regard du classement de personnes, et `hasVideo` qui écarte
   en pratique ceux qui ne veulent pas diffuser leur image. Les remettre dans le
   courriel d'accompagnement plutôt que de les laisser au §3 d'une pièce jointe.

**Fait quand.** La note est relue ligne à ligne contre
`packages/api/src/services/catalogue.filters.ts`,
`packages/api/src/validators/recruiter.ts`, `packages/api/openapi.yaml` **et**
`CatalogueFilters.tsx`, re-datée, et les deux questions ouvertes sont dans le
corps du courriel.

### FP-6 — Aucune trace des recherches effectuées · domaine D · hors échéance

Le §4 de la note le dit déjà : aucun enregistrement n'est conservé des critères
qu'un recruteur a employés. Ce n'est pas exigé par le courriel du 7 septembre.
C'est ce qui manquera le jour où une plainte pour discrimination arrive, parce
que la plateforme ne pourra démontrer ni ce qui a été filtré, ni le contraire.
À arbitrer, pas à improviser cette semaine.

---

## 3. Mineurs

### FP-7 — La vérification d'âge est faite ; la note des deux lignes se contredit avec le recensement · domaine A

**Demandé.** « Une vérification de l'âge à l'inscription me paraît
indispensable. Dites-moi également, en deux lignes, ce que vous faites des
comptes déjà créés sans date de naissance, y compris ceux de vos jeux de
démonstration. »

**État réel — la partie technique est faite.**

- `packages/api/src/validators/auth.ts` : `birthDateSchema` refuse en dessous de
  `MIN_APPLICANT_AGE`, et une date future échoue au même contrôle (l'âge est
  négatif). `registerSchema` est une union discriminée sur le rôle : un
  `APPLICANT` **ne peut pas** être créé sans date de naissance, un `RECRUITER`
  n'en fournit jamais.
- `packages/web/src/pages/Auth/RegisterPage.tsx:195-210` demande le champ aux
  seuls candidats, avec le régime 16-18 expliqué dans l'aide du champ.
- `packages/api/src/services/visibility.ts` tient le profil d'un mineur hors de
  toute surface publique ; un profil de mineur, un profil en attente et un
  identifiant inexistant répondent le même 404.

**Ce qui manque.** `docs/legal/accounts-without-birthdate.md` (12 lignes) répond
à la question posée, mais :

1. **Elle est en anglais** (cf. FP-9).
2. **Elle se lit en contradiction avec le recensement.** La note écrit « every
   seeded job-seeker carries a birth date » ; `docs/livrables/recensement-du-3-septembre.md`
   compte « Comptes sans date de naissance : 3 (les comptes de service) » sur le
   build propre. Les deux sont vraies — les trois comptes sont des recruteurs et
   un administrateur, à qui la date n'est jamais demandée — mais **rien dans les
   deux documents ne le dit**, et ils seront lus côte à côte. Une phrase suffit.
3. La note dit qu'un compte sans date « is treated as an adult by every public
   surface ». C'est exactement la phrase qu'elle ira tester. Vérifier que
   `visibility.ts` fait bien ça pour `birthDate = null` — et si le comportement
   est un défaut plutôt qu'une décision, l'écrire comme une décision assumée ou
   le changer.

**Fait quand.** Deux lignes en français, exactes, qui ne se contredisent avec
aucune autre pièce de la remise, et le comportement `birthDate = null` couvert
par un test.

---

## 4. Accessibilité

### FP-8 — Audit clavier · domaine A · ✅ refermé le 7 septembre

> **Refermé, et il avait raison de l'être.** Le parcours clavier est désormais
> exécuté dans un vrai navigateur sur les trois écrans, l'anneau de focus lu en
> style calculé : `docs/preuves/AD-6-clavier-trois-ecrans.txt`. **La
> vérification a trouvé un défaut réel que la relecture de source avait déclaré
> conforme** — activer une vidéo au clavier perdait le focus (WCAG 2.4.3). Il
> est corrigé et couvert par des tests. `rgaa-audit.md` et la déclaration
> disent maintenant ce qui a été mesuré, et ce qui ne l'a pas été.

**Demandé.** « Je vous demande trois écrans nommés et **réellement vérifiés** :
le parcours d'inscription, la fiche profil publique, le catalogue recruteur.
Navigation complète au clavier, focus visible en permanence, et les rapports de
contraste mesurés. […] Une déclaration d'accessibilité qui annonce une
conformité que la vérification ne soutient pas m'expose personnellement. »

**État réel.** `docs/legal/rgaa-audit.md` (65 lignes) est sérieux et honnête sur
sa méthode. Il faut distinguer ses deux moitiés :

- **Le contraste est réellement mesuré.** Les ratios sont recalculés depuis les
  valeurs hexadécimales de `global.css` par la formule de luminance relative
  WCAG, en thème clair et sombre, et non recopiés des commentaires du fichier.
  Ce travail tient. L'écart déclaré (le bleu institutionnel `#1b3a6b` à 1,50:1
  sur fond sombre) est nommé et justifié, ce qui est la bonne façon de le
  traiter.
- **Le clavier ne l'est pas.** Sa méthode, citée : « keyboard navigation was
  checked by **reading component source** for non-semantic interactive
  elements ». Et la déclaration §4 le reconnaît : « No automated accessibility
  scanner was used ». Une relecture de source établit qu'il n'y a pas de `<div
onClick>` ; elle n'établit pas que l'ordre de tabulation est utilisable, que
  le focus ne se perd pas à l'ouverture d'un dialogue, ni qu'aucun piège
  n'existe. **C'est précisément l'écart qu'elle dit ne pas vouloir couvrir.**

**Travail à faire.**

1. **Refaire un vrai passage clavier**, écran par écran, sans souris :
   `/inscription`, `/profils/:id`, `/recruteur/catalogue`. Consigner l'ordre de
   tabulation réel, contrôle par contrôle, avec une capture du focus sur
   chacun. Points à tester nommément, parce qu'ils sont les plus susceptibles
   de casser : le `ContactDialog` (restitution du focus à la fermeture,
   `Échap`), les `<label className="choice">` du sélecteur de rôle
   (`RegisterPage.tsx:120-139`), le bouton-affiche du lecteur vidéo, la
   pagination, et le lien d'évitement (`AppLayout.tsx:29`).
2. **Compléter le tableau de contrastes.** Il mesure les jetons de texte sur
   `surface-page` et `surface-1`. Le courriel dit « chaque couple texte / fond
   que vous utilisez ». Ne sont pas couverts : le texte sur `--accent` et sur
   les fonds de statut, les pastilles de badge, le libellé bleu de
   `.button--primary` sur son fond, l'anneau de focus contre ses surfaces, le
   texte des champs désactivés et les `placeholder`. Les énumérer
   mécaniquement depuis `global.css` plutôt que de les choisir.
3. Reprendre les corrections trouvées dans le même passage — c'est le domaine
   propriétaire de chaque écran qui corrige le sien.

**Fait quand.** Le tableau « Keyboard & focus — per screen » cite un ordre de
tabulation observé et non un résultat de relecture, et chaque ligne renvoie à
une capture dans `docs/preuves/`.

### FP-9 — La déclaration porte deux trous juridiquement obligatoires · domaine A

**État réel.** `docs/legal/accessibility-declaration.md` est bien construite :
elle déclare « **Non conforme** », borne son périmètre aux trois écrans, dit ce
qui n'est pas évalué (§3) et décrit sa méthode y compris ses limites (§4). C'est
exactement la « déclaration partielle et exacte » demandée.

**Ce qui manque — et ce n'est pas rédactionnel.**

- **§5 « Feedback and contact » : `[To be completed]`.**
- **§6 « Enforcement » : `[To be completed]`** — renvoi au Défenseur des droits
  et procédure de réclamation.

Ces deux sections sont un **contenu obligatoire** d'une déclaration
d'accessibilité française, pas un ornement. La déclaration est due vendredi ;
elle ne peut pas partir avec deux crochets.

**Travail à faire.** Le §6 note déjà, à raison, que la formulation exacte doit
venir d'elle plutôt que d'être rédigée ici. **Demander les deux éléments dès
aujourd'hui, dans un courriel séparé** — pas dans la remise de vendredi, ou la
réponse arrivera après l'échéance. Si elle ne répond pas à temps, remettre la
déclaration avec les deux sections marquées « en attente de votre formulation,
demandée le 7 septembre » : une attente datée et attribuée n'est pas un trou.

### FP-10 — Les six pièces juridiques sont en anglais · domaine A

**État réel.** `docs/legal/` est intégralement en anglais :
`accessibility-declaration.md`, `rgaa-audit.md`, `cgu-draft.md`,
`consent-text-v1.md`, `accounts-without-birthdate.md`,
`video-consent-revocation.md`. Les autres livrables — registre, note sur les
critères, recensement, remontées — sont en français.

**Pourquoi c'est un écart et pas une préférence.** La destinataire écrit en
français ; la déclaration d'accessibilité et les CGU sont des documents
**publiés**, et la convention du dépôt est explicite : le code et les
commentaires en anglais, ce qui s'adresse au produit et à ses interlocuteurs en
français. Le texte de consentement en particulier
(`docs/legal/consent-text-v1.md`) est un texte que des candidats acceptent : il
n'est opposable que dans la langue où il leur a été présenté.

**Travail à faire.** Traduire les six. Le texte de consentement est prioritaire
et sensible : sa traduction change ce qui a été accepté, donc elle impose un
`CONSENT_TEXT_VERSION` en `v1.1` (`@profils-actifs/shared`), une `v1.1` du
fichier archivée à côté de la `v1.0`, et **surtout pas** une réécriture de la
`v1.0` — les vidéos déjà publiées portent `consentTextVersion: "v1.0"` et
doivent continuer de renvoyer au texte réellement accepté.

### FP-11 — Aucun garde-fou d'accessibilité dans l'outillage · domaine A · hors échéance

`eslint-plugin-jsx-a11y` n'est pas installé, et rien n'exécute d'axe.
`@testing-library/react` et `jest-environment-jsdom` sont déjà là
(`packages/web/package.json`), donc `jest-axe` sur les trois écrans coûte peu et
transforme la déclaration en quelque chose qui reste vrai la semaine prochaine.
Non exigé vendredi ; à proposer dans la note d'accompagnement, parce que la
question « et comment saurez-vous que ça ne régresse pas » viendra.

---

## 5. CGU

### FP-12 — Le projet de CGU est prêt à un trou près ; l'application est correcte · domaine A

**Demandé.** « Aucune CGU mise en ligne sans avis préalable de mon service :
merci de me transmettre votre projet avant publication, pas après. »

**État réel — l'application respecte déjà la consigne.**
`packages/web/src/pages/Auth/RegisterPage.tsx:220` affiche à l'inscription :
« Aucune condition générale n'est publiée pour l'instant : le projet est en
cours de relecture juridique. » Aucune route `/cgu`, aucune case d'acceptation,
rien de publié. C'est exactement ce qu'elle demande.

**Ce qui manque pour vendredi.**

1. `docs/legal/cgu-draft.md` §8 « Contact » porte `[to be completed]`.
2. Le document est en anglais (FP-10).
3. **§7 « Account deletion » renvoie à plus tard**, et le §3 du registre
   n'applique aucune durée de conservation. Ces deux trous sont le même trou, et
   elle lira les deux documents côte à côte — le registre le dit lui-même au §4.
   Ils doivent au minimum se renvoyer l'un à l'autre et dire la même chose.
4. Transmettre avec la mention explicite « projet, non publié, transmis pour
   avis préalable conformément à votre demande du 7 septembre ».

### FP-13 — Après avis : la base légale « exécution du contrat (CGU) » n'a pas de contrat · domaine A · hors échéance

Le registre donne « Exécution du contrat (CGU) » comme base légale du
traitement « Compte utilisateur ». Or aucune CGU n'est publiée, aucune case
d'acceptation n'existe à l'inscription, et **aucun champ n'enregistre quelle
version un compte a acceptée**. C'est cohérent aujourd'hui — on ne peut pas
faire accepter un texte qui n'existe pas — mais la base légale invoquée reste
sans support tant que ça dure.

À prévoir dès que l'avis revient : route `/cgu`, case d'acceptation non
pré-cochée à l'inscription, et `User.cguVersionAccepted` + `cguAcceptedAt` sur
le modèle de la mécanique déjà éprouvée pour les vidéos
(`video-consent.ts`) — même patron, même raison.

---

## 6. Registre de traitement

### FP-14 — Registre §4 · domaine D · ✅ refermé le 7 septembre

> **Refermé.** Le §4 ne déclare plus une lacune inexistante : il dit que
> l'écart annoncé le 4 septembre est comblé, nomme la migration et les quatre
> endroits où le vérifier, et reconnaît que le document remis était en retard
> sur son propre modèle. L'en-tête est re-daté, et les lignes `Video` et
> `ModerationLog` du §2 sont réalignées sur le schéma.

**État réel.** `docs/livrables/registre-de-traitement.md` (249 lignes) est la
pièce la plus complète de la remise : huit traitements, chacun avec finalité,
base légale, catégories, conservation, destinataires et **les vrais noms de
tables et de champs**, ce qu'elle exige explicitement. Ses trois avertissements
d'ouverture — aucune durée n'est appliquée, aucun journal de connexion
n'existe, un écart subsiste — sont la bonne façon de traiter une absence.

**Le problème.** Le §4 « Le seul écart qui subsiste » déclare que
`ModerationLog` est clé sur `profileId` seul et ne peut pas porter la trace
d'une décision de modération vidéo (tâche VI-10, échéance jeudi matin).

**C'est faux depuis le 2 septembre.** `packages/db/prisma/schema.prisma` (modèle
`ModerationLog`) porte `videoId String?`, la relation `video`, et un index
`@@index([videoId])` ; la migration `20260902095149_video_moderation_log` est
appliquée. La trace « qui a décidé et quand » existe : `adminId`, `action`,
`reason`, `createdAt`. Elle est même déjà lue —
`packages/api/src/utils/mappers.ts:10-16` (`videoDecisionInclude`) s'en sert
pour rendre au candidat le motif de refus de sa vidéo.

Envoyer un registre qui déclare une lacune refermée, à quelqu'un qui écrit
qu'« une fiche qui ne renvoie pas au modèle réel est un exercice de style »,
coûte plus cher que la lacune elle-même.

**Travail à faire.** Refermer le §4, en datant la fermeture et en nommant la
migration. Puis relire le reste du registre contre le schéma courant avec la
même exigence — l'en-tête cite le commit `1d44bad` et cinq migrations ; `main`
est à `2cd8f16` avec sept migrations.

### FP-15 — Le registre est daté du 4 septembre et sa liste diffère de celle demandée · domaine D

1. **Re-dater** l'en-tête (échéance vendredi 4 → vendredi 11), et remplacer la
   référence de commit et le compte de migrations par les valeurs du jour.
2. **Le courriel nomme cinq traitements** : compte, vidéo, questionnaire,
   contact recruteur, **journal de connexion**. Le registre en décrit huit, et
   répond au §2.9 que le journal de connexion n'existe pas — l'authentification
   est un JWT sans état, aucune session n'est stockée, aucune connexion n'est
   horodatée. **C'est la bonne réponse et il faut la garder.** Mais elle a
   nommément demandé cette ligne : elle doit être **dans le corps du courriel
   d'accompagnement**, pas au §2.9 d'une pièce jointe de 249 lignes. Une
   demande explicite mérite une réponse explicite.
3. **Aucune durée de conservation n'est appliquée par le code.** Le §3 le dit
   déjà, et les durées du tableau sont présentées comme des propositions à
   valider. Cette honnêteté doit survivre à la relecture : ne pas laisser un
   relecteur « nettoyer » l'avertissement en croyant améliorer le document.

### FP-16 — Les cinq arbitrages demandés au §5 du registre n'ont jamais reçu de réponse · tous domaines

Ils ont été posés le 4 septembre et le courriel du 7 n'y répond pas. Les
remettre dans le courriel d'accompagnement, parce qu'aucun ne se referme sans
elle : les durées de conservation ; le journal de connexion (le créer, ou acter
par écrit qu'il n'y en a pas) ; l'intégration par iframe, qui fait sortir
l'image et la voix vers un hébergeur tiers possiblement hors UE ; la décision
automatisée liée au badge, qui conditionne la visibilité du candidat ; et le
mécanisme d'allocation adossé aux « likes », qui n'est pas implémenté et ne le
sera pas sans avis écrit (`docs/remontees/01-allocation-et-likes.md`).

---

## 7. Trouvé en corrigeant, absent du premier relevé

Le relevé du matin a été fait sur un `main` local **en retard de sept commits**
sur `origin/main`, ce qui est une erreur de méthode : il a manqué l'interface
`VideoProvider` fusionnée entre-temps. Les entrées ci-dessous ont été trouvées
en écrivant les correctifs, et sont toutes refermées.

### FP-17 — L'API ne servait pas du tout `/uploads` · domaine B · corrigé

`packages/api/src/app.ts` ne montait **aucune** route statique pour les fichiers
déposés, alors que `resolveUploadedVideoSrc` (`packages/web/src/utils/embed.ts`)
construit des adresses `${origine}/uploads/…`. Toute vidéo déposée aurait donc
répondu 404, quand bien même le dépôt aurait fonctionné. Personne ne s'en était
aperçu parce qu'aucune vidéo déposée n'existait.

Corrigé : montage `express.static` hors du préfixe `/api` et **avant** le
limiteur de débit (une page de profil tire la vidéo _et_ sa piste ; les faire
compter dans le quota du lecteur rend la page illisible au bout de quelques
rechargements), avec `index: false`, `dotfiles: 'deny'`, et
`Cross-Origin-Resource-Policy: cross-origin` — Helmet le met à `same-origin` par
défaut, ce qui bloquerait l'application web sur son propre port.

### FP-18 — `UPLOAD_DIR` mal configuré faisait échouer la révocation en silence · domaine B · corrigé

`.env.local` portait `UPLOAD_DIR=./uploads`, qui se résout **à l'intérieur du
dépôt** et que `assertUploadDirOutsideAppCode` refuse (§8.5). Or
`removeUploadedFile` avale cette exception : la suppression du fichier échouait
sans bruit, et la ligne partait quand même.

Autrement dit, sur la configuration versionnée, **la révocation laissait le
fichier sur le disque** — exactement le reproche que le courriel du 7 septembre
demande d'écarter. Corrigé sur trois plans : la valeur de `.env.local` est
alignée sur `.env.example` ; `app.ts` résout le répertoire **au démarrage**, donc
une mauvaise configuration arrête le serveur au lieu de se découvrir à la
première révocation ; et le message de repli dit ce qu'il en coûte plutôt que de
murmurer.

### FP-19 — Un import dupliqué cassait la construction du paquet `db` · domaine C · corrigé

`packages/db/src/seed.ts` importait `CONSENT_TEXT_VERSION` deux fois (lignes 2 et
4), vraisemblablement une fusion mal résolue. Corrigé.

### FP-20 — Les scripts de preuve ne sont lançables sur aucun clone · tous domaines · corrigé

Les scripts de `scripts/preuves/` importent `puppeteer-core`, qui n'était
déclaré dans **aucun** `package.json`. Les preuves existantes n'étaient donc pas
reproductibles par un tiers — ce qui est gênant pour des pièces destinées à
appuyer une déclaration. Ajouté en `devDependency` à la racine.

### FP-21 — Une branche de preuves d'accessibilité n'est toujours pas fusionnée · à arbitrer

`origin/Victor-part-2` porte trois commits non fusionnés, dont **VI-6**, le
parcours clavier de la fiche profil publique — c'est cette preuve qui a révélé
le défaut de focus corrigé en FP-8. Son harnais
(`scripts/preuves/lib/navigateur.ts`, `journal-preuve.ts`, `profil-demo.ts`) a
été repris **tel quel** sur cette branche, aux mêmes chemins, pour que les deux
fusionnent sans conflit. La branche reste à intégrer.

---

## Récapitulatif

| #     | Objet                                                 | Domaine | Type          | Échéance     |
| ----- | ----------------------------------------------------- | ------- | ------------- | ------------ |
| FP-1  | Sous-titres : piste réelle affichée, UI honnête       | B       | Code + doc    | **corrigé**  |
| FP-2  | Consentement enregistré mais invisible                | B       | Code          | souhaitable  |
| FP-3  | Révocation démontrée, fichiers réellement supprimés   | B       | Code + preuve | **corrigé**  |
| FP-4  | Vidéos tierces dans le jeu de démonstration           | B       | Données       | **vendredi** |
| FP-5  | Note critères : une ligne périmée, à re-dater         | D       | Doc           | **vendredi** |
| FP-6  | Aucune trace des recherches recruteur                 | D       | Code          | à arbitrer   |
| FP-7  | Note « comptes sans date » : anglais + contradiction  | A       | Doc           | **vendredi** |
| FP-8  | Clavier réellement vérifié ; 1 défaut trouvé, corrigé | A       | Vérif.        | **corrigé**  |
| FP-9  | Déclaration : §5 et §6 obligatoires manquants         | A       | Doc + relance | **vendredi** |
| FP-10 | Six pièces juridiques en anglais                      | A       | Doc           | **vendredi** |
| FP-11 | Aucun garde-fou d'accessibilité outillé               | A       | Outillage     | à proposer   |
| FP-12 | CGU : trou de contact, anglais, §7 à aligner          | A       | Doc           | **vendredi** |
| FP-13 | Base légale CGU sans contrat accepté                  | A       | Code          | après avis   |
| FP-14 | Registre §4 : réécrit, écart refermé et daté          | D       | Doc           | **corrigé**  |
| FP-15 | Registre : date, commit, journal de connexion         | D       | Doc           | **vendredi** |
| FP-16 | Cinq arbitrages sans réponse depuis le 4 septembre    | tous    | Courriel      | **vendredi** |
| FP-17 | `/uploads` n'était pas servi par l'API                | B       | Code          | **corrigé**  |
| FP-18 | `UPLOAD_DIR` invalide : révocation muette             | B       | Config + code | **corrigé**  |
| FP-19 | Import dupliqué cassant la construction `db`          | C       | Code          | **corrigé**  |
| FP-20 | `puppeteer-core` non déclaré : preuves non rejouables | tous    | Outillage     | **corrigé**  |
| FP-21 | Branche `Victor-part-2` (VI-6) non fusionnée          | tous    | Intégration   | à arbitrer   |
