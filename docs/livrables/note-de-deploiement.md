# Note de déploiement — ProfilsActifs

**Destinataire** Thomas Vignal, conseiller au numérique · pour transmission à la Direction
**Référence** JEB/DNI/2026-003 §8.3 · **Échéance** vendredi 4 septembre, 17h00
**Tâche** EW-9 · **Rédacteur** Ewan — domaine D, contrat d'API et intégration

Ce document répond aux trois questions du §8.3 : **où** cela tournerait en
production, **quelles ressources** cela demanderait, et **quelles données
sortiraient de l'infrastructure, vers qui**. Ce n'est pas un chiffrage.

---

## 1. Où — et le critère de recette qui est déjà tenu

La contrainte du §8.3 est vérifiable et elle est vérifiée : **l'application
tourne entièrement en local, à partir d'un clone et des instructions
d'installation, sans aucun compte tiers.**

Trois processus, rien d'autre :

| Processus | Ce que c'est                                        | Port                                   |
| --------- | --------------------------------------------------- | -------------------------------------- |
| API       | Node.js, Express 5, un binaire `node dist/index.js` | 3000                                   |
| Base      | PostgreSQL 16, conteneur `docker compose`           | 5432                                   |
| Interface | React compilé par Vite en fichiers statiques        | servis par n'importe quel serveur HTTP |

Aucune dépendance à un service payant, à un compte propriétaire ou à un
fournisseur d'infonuagique. Concrètement, cela signifie : pas de stockage objet
géré, pas de base gérée, pas d'authentification en tant que service, pas
d'envoi de courriel commercial, pas d'API cartographique. La doctrine « cloud
de confiance » qui exclut AWS, GCP et Azure ne pose donc aucun problème
d'architecture — il n'y a rien à en détacher.

**La documentation d'API respecte la même contrainte.** Swagger UI est servi
sur `/api/docs` à partir des fichiers du paquet `swagger-ui-dist` installés dans
le dépôt, jamais depuis un CDN, et la vérification en ligne de Swagger (qui
enverrait l'URL du contrat à `validator.swagger.io`) est désactivée. La preuve
`docs/preuves/EW-1-swagger-ui.png` est une capture de la page rendue par un
navigateur dont toute résolution DNS hors `localhost` est bloquée.

**Cible de production recommandée.** Une machine virtuelle unique chez un
hébergeur souverain (le socle SecNumCloud éligible, ou une VM d'un centre de
données de l'État), portant les trois processus derrière un terminateur TLS.
L'architecture n'impose pas plus, et la charge attendue d'un démonstrateur ne
justifie pas de séparer davantage. Si la séparation devient nécessaire, la
première coupure naturelle est la base de données sur sa propre machine ; rien
dans le code ne la retient (`DATABASE_URL` est une variable d'environnement).

---

## 2. Ressources

Dimensionnement pour un démonstrateur, puis pour une mise en service.

|               | Démonstrateur                                                 | Mise en service (ordre de grandeur) |
| ------------- | ------------------------------------------------------------- | ----------------------------------- |
| Processeur    | 2 vCPU                                                        | 4 vCPU                              |
| Mémoire       | 4 Go                                                          | 8 Go                                |
| Disque        | 20 Go                                                         | 50 Go, extensible                   |
| Base          | PostgreSQL 16, extension `pg_trgm` (livrée avec les contribs) | idem, sauvegarde quotidienne        |
| Sortie réseau | négligeable — voir §3                                         | idem                                |

Les mesures qui appuient la ligne « disque » : sur une base de mesure de
50 000 profils, 150 000 associations profil-compétence et 300 compétences, la
totalité des index du catalogue pèse moins de 17 Mo
(`docs/preuves/EW-5-index-catalogue.txt`). Le volume de données est dominé par
le texte des profils, pas par la structure. **Les vidéos ne sont pas hébergées
ici** — ce qui explique qu'un disque de 20 Go suffise, et c'est le sujet du §3.

Deux points d'exploitation à ne pas découvrir en production :

- **`autovacuum` doit tourner.** Les index de recherche sont des index GIN
  trigrammes ; ils gardent les entrées récemment insérées dans une liste
  d'attente que le planificateur refuse de traverser tant qu'un `VACUUM` ne l'a
  pas vidée. Sur une base fraîchement chargée en masse, un `VACUUM ANALYZE`
  explicite fait partie de la procédure de mise en service.
- **La limitation de débit est en mémoire vive.** 100 requêtes par 15 minutes,
  par adresse IP ou par compte, comptées dans le processus. Elle est donc remise
  à zéro à chaque redémarrage et ne se partage pas entre deux instances : le
  jour où l'API tourne en plusieurs exemplaires, il faut un compteur partagé.
  À une instance, le comportement est correct.

---

## 3. Ce qui sort de l'infrastructure, et vers qui

C'est la question qui compte, et la réponse tient en un point majeur et trois
mineurs.

### 3.1 Les vidéos — le seul flux significatif

Les vidéos ne sont pas stockées par la plateforme. `Video.url` pointe une
ressource **hébergée par YouTube, Vimeo ou Dailymotion**, intégrée en `iframe`
sur la page de profil et dans le fil. Deux conséquences distinctes, à ne pas
confondre :

1. **L'image et la voix du candidat sont chez un tiers.** Elles y ont été
   déposées par le candidat lui-même, et la plateforme n'en détient que
   l'adresse. Corollaire à écrire dans la CGU : quand un candidat révoque son
   consentement, nous supprimons la ligne `Video` et le lien — **la vidéo
   continue d'exister chez l'hébergeur tiers** tant qu'il ne l'y supprime pas
   lui-même. La preuve « répertoire de stockage avant et après » attendue par le
   §7.1 ne s'applique donc pas telle quelle.
2. **Chaque visiteur qui affiche une page portant une vidéo contacte ce tiers.**
   Son adresse IP, son navigateur et, selon le domaine employé, ses témoins de
   connexion partent chez Google, Vimeo ou Dailymotion — y compris pour un
   visiteur non authentifié, puisque le fil et les pages de profil sont
   publics. C'est un transfert de données personnelles vers un tiers, possiblement
   hors Union européenne, et il concerne le **visiteur**, pas seulement le
   candidat.

Ce que le code fait déjà : `packages/web/src/utils/embed.ts` n'accepte que le
schéma `https` et une liste fermée d'hôtes, ce qui empêche d'intégrer un site
arbitraire dans le cadre de l'application. `youtube-nocookie.com` figure dans
cette liste.

**Recommandation, à arbitrer :** normaliser les liens YouTube vers
`youtube-nocookie.com` à l'enregistrement, et n'afficher l'iframe qu'après un
clic explicite du visiteur (affichage d'une vignette d'abord). Cela supprime le
contact avec le tiers tant que le visiteur ne l'a pas demandé. Ce n'est pas
implémenté ; c'est une décision de produit autant que de conformité, et elle
appartient au domaine B (vidéo) et à Florine Pontaillac.

**L'alternative** — héberger les vidéos nous-mêmes — coûte le stockage, la
bande passante, le transcodage et un lecteur, ce que le §4.2 et le §8.5
autorisent à éviter en préférant l'intégration. Nous nous en tenons à ce choix,
mais il n'est pas gratuit : ce qu'il économise en infrastructure, il le déplace
en conformité.

### 3.2 Les trois flux mineurs

| Flux                         | Vers qui               | Quand                      | Contenu                                                                                                                                                                       |
| ---------------------------- | ---------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Installation des dépendances | registre npm           | à l'installation seulement | métadonnées de paquets. Aucune donnée applicative.                                                                                                                            |
| Analytique d'installation    | `scarf.sh`             | **désactivée**             | `swagger-ui-dist` dépend de `@scarf/scarf`, dont le script de post-installation remonte des statistiques. Neutralisé par `scarfSettings.enabled: false` à la racine du dépôt. |
| Validation Swagger           | `validator.swagger.io` | **désactivée**             | Swagger UI y envoie par défaut l'URL du contrat pour afficher sa pastille de validité. Coupée par `validatorUrl: null`.                                                       |

### 3.3 Ce qui ne sort pas

Aucun courriel n'est envoyé : les notifications sont internes à l'application
(`services/notifications.ts` écrit des lignes en base, il n'expédie rien). Les
variables `SMTP_*` du fichier `.env.example` sont des réservations pour une
fonctionnalité non construite, et le fichier le dit désormais explicitement.
Aucune police de caractères, aucune feuille de style, aucun script n'est chargé
depuis un domaine extérieur, ni par l'application, ni par sa documentation.
Aucune télémétrie, aucun outil de mesure d'audience.

---

## 4. Ce qui manque avant une vraie mise en service

Nous préférons le lister que de le laisser découvrir.

1. **Sauvegarde et restauration.** Aucune procédure n'existe. Un `pg_dump`
   quotidien et une restauration **testée** sont le minimum, et la restauration
   compte plus que la sauvegarde.
2. **Journaux.** Le processus écrit sur la sortie standard, sans structure ni
   conservation. Aucun journal de connexion n'existe (voir le registre de
   traitement, §2.8).
3. **TLS.** Rien n'est prévu dans le dépôt : c'est au terminateur en amont de
   s'en charger. L'API émet déjà `Strict-Transport-Security`, ce qui suppose
   qu'on lui parle en HTTPS.
4. **Secrets.** `JWT_SECRET` est validé au démarrage (16 caractères minimum) et
   le processus refuse de démarrer sans lui. En production, il vient de
   l'environnement, jamais d'un fichier du dépôt — `.env.example` ne contient
   aucune valeur réelle.
5. **Compteur de débit partagé**, si l'API tourne en plusieurs exemplaires (§2).
6. **Tests de charge.** Annoncés au §8.7 pour la revue technique de la semaine
   prochaine, périmètre non fourni. Nous en demandons le périmètre plutôt que
   d'improviser un chiffre qu'il faudrait ensuite défendre.
