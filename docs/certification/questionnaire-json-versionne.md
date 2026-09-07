# Le questionnaire comme fichier versionné — note technique (§ demande Thomas Vignal, 2026-09-07)

## Ce qui a été construit

- `certification/questions.v1.json` — les 100 questions, `version` en en-tête, plus code applicatif à l'intérieur.
- `packages/db/src/questionnaire-loader.ts` — seul point d'accès au fichier. Il parse le JSON, valide chaque question et chaque option contre un schéma strict (types, options minimales pour les questions à choix, identifiants uniques), et lève une erreur nommant précisément la question et le champ en cause au premier problème rencontré.
- `npm run db:seed` appelle ce chargeur **avant** d'écrire la moindre ligne en base : un fichier invalide arrête tout le seed, sans écriture partielle. Vérifié en pratique (question cassée volontairement → seed refuse de démarrer, base intacte).
- `QuestionnaireVersion` (table à une ligne) enregistre la version actuellement chargée ; `CertificationAttempt.questionnaireVersion` est renseigné à la création de chaque tentative, à partir de cette valeur.

## Pourquoi l'interface expose ces méthodes-là

Une seule fonction publique (`loadQuestionnaire`) plutôt qu'un module de lecture générique : le fichier n'a qu'un seul consommateur légitime (le seed), donc une seule porte d'entrée. La validation est volontairement **totale avant toute écriture** — pas de validation ligne par ligne pendant l'insertion — pour garantir qu'aucune conséquence partielle n'existe si le fichier est mauvais. Le message d'erreur nomme la question fautive (par `id`, ou par position si l'`id` lui-même est invalide) parce qu'un message générique du type « fichier invalide » n'aiderait personne à corriger un JSON de 2000 lignes.

Le format choisi pour signaler une erreur (exception qui remonte jusqu'à `main()` et fait échouer le process avec un code de sortie non nul) correspond à l'usage réel : `db:seed` est lancé en ligne de commande ou en CI, jamais interactivement — un code de sortie clair est ce qui doit déclencher l'alerte, pas un message affiché qu'on pourrait manquer.

## Ce qu'on ferait différemment avec une vraie instance ministérielle

Ce dispositif suppose que la personne qui édite le contenu sait éditer un fichier JSON et ouvrir une pull request — c'est un compromis acceptable pour une équipe de développement, pas pour un·e agent·e du Ministère. Avec une vraie instance :

- **Une interface d'édition** (formulaire, pas de JSON à la main) écrivant vers le même fichier versionné en arrière-plan, pour garder la traçabilité par commit sans exiger de savoir écrire du JSON.
- **Un flux de validation avant publication** : la même validation stricte tournerait sur la proposition de changement avant qu'elle soit mergeable, avec retour immédiat à l'auteur plutôt qu'un échec au déploiement.
- **Le CRUD admin actuel** (`PATCH /admin/certification/questions/:id`), qui écrit directement en base, devient alors incohérent avec ce modèle — à réévaluer : soit il disparaît au profit du flux versionné, soit il devient l'interface de saisie qui *génère* le commit plutôt que de modifier la base en direct. Non traité dans ce lot, à trancher séparément.
