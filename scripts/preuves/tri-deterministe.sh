#!/usr/bin/env bash
#
# EW-9 — the catalogue's default ordering is deterministic, and the proof is
# two walks rather than a sentence claiming it.
#
# Walks the recruiter catalogue page by page, first to last, recording the
# profile ids in the order they arrive. Walks it a second time. Compares the
# two sequences against each other and against the row count taken straight
# from Postgres: identical, no duplicate, nothing missing, exactly the number
# of profiles the catalogue is allowed to show.
#
# Then it does the thing that will happen during the demonstration: a profile
# is modified while a recruiter is paging. The script provokes it on purpose,
# between page 1 and page 2, and records what the recruiter actually sees.
# The modification is undone before the script exits, including on failure.
#
#   docker compose up -d postgres
#   npm run db:seed
#   npm run dev -w @profils-actifs/api
#   ./scripts/preuves/tri-deterministe.sh
#
# A small page size is deliberate: the demonstration is about crossing page
# boundaries, and the seed set fits on one page at the default limit of 20.

set -euo pipefail

API_URL="${API_URL:-http://localhost:3000/api}"
COMPTE_RECRUTEUR="${COMPTE_RECRUTEUR:-recruteur@profils-actifs.fr}"
MOT_DE_PASSE="${MOT_DE_PASSE:-Password123!}"
SERVICE_BASE="${SERVICE_BASE:-postgres}"
BASE="${BASE:-profils_actifs_dev}"
UTILISATEUR="${UTILISATEUR:-profils_user}"
LIMITE="${LIMITE:-3}"

# A walk that never terminates would hang the proof rather than fail it.
PAGES_MAX=200

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/preuve-http.sh
source "$RACINE/scripts/preuves/lib/preuve-http.sh"

PASSE_1="$RACINE/docs/preuves/EW-9-tri-passe-1.txt"
PASSE_2="$RACINE/docs/preuves/EW-9-tri-passe-2.txt"
SORTIE="$RACINE/docs/preuves/EW-9-tri-comparaison.txt"

TEMPORAIRE="$(mktemp -d)"
trap 'rm -rf "$TEMPORAIRE"' EXIT

# One aligned "label : value" line in the transcript. Hand-padded labels drift
# the moment a value changes width; this cannot. The padding is computed from
# ${#label}, which counts characters, rather than left to printf's %-42s, which
# counts bytes and so under-pads every label carrying an accent.
LARGEUR_CONSTAT=42
constat() {
  local label="$1" valeur="$2" reste=$((LARGEUR_CONSTAT - ${#1}))

  [ "$reste" -gt 0 ] || reste=0
  printf '  %s%*s : %s\n' "$label" "$reste" '' "$valeur" >>"$SORTIE"
}

psql_dev() {
  docker compose -f "$RACINE/docker-compose.yml" exec -T "$SERVICE_BASE" \
    psql -tAq -v ON_ERROR_STOP=1 -U "$UTILISATEUR" -d "$BASE" "$@"
}

# Same, reading the statement from stdin. Anything carrying a quote goes
# through here rather than through a -c argument: the nesting needed to put
# a SQL string literal inside a shell string is where these scripts rot.
psql_dev_in() {
  docker compose -f "$RACINE/docker-compose.yml" exec -T "$SERVICE_BASE" \
    psql -tAq -v ON_ERROR_STOP=1 -U "$UTILISATEUR" -d "$BASE"
}

# The catalogue's visibility rule, transcribed from
# packages/api/src/services/visibility.ts so the count this proof compares
# against is the same population the API is allowed to serve.
VISIBLE_SQL='p."moderationStatus" <> '"'"'REJECTED'"'"' AND u."isActive" AND u.role = '"'"'APPLICANT'"'"''

preuve_verifier_api "$API_URL"

TOKEN="$(
  curl -sS -X POST "$API_URL/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$COMPTE_RECRUTEUR\",\"password\":\"$MOT_DE_PASSE\"}" | jq -r '.token'
)"

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Connexion recruteur refusée pour $COMPTE_RECRUTEUR — rejouez npm run db:seed." >&2
  exit 1
fi

catalogue() {
  curl -sS "$API_URL/recruiter/catalogue?$1" -H "Authorization: Bearer $TOKEN"
}

# Walks every page in order and prints one id per line. The query string is
# passed in whole, so the same function serves the default ordering, an
# explicit `sort=recent`, and the interrupted walk further down.
parcourir() {
  local requete="$1" limite="${2:-$LIMITE}" page=1 pages corps

  while :; do
    corps="$(catalogue "$requete&page=$page&limit=$limite")"
    pages="$(printf '%s' "$corps" | jq -r '.pagination.pages')"

    printf '%s' "$corps" | jq -r '.data[].id'

    page=$((page + 1))
    [ "$page" -le "$pages" ] || break
    [ "$page" -le "$PAGES_MAX" ] || {
      echo "Plus de $PAGES_MAX pages — parcours interrompu." >&2
      exit 1
    }
  done
}

# ---------------------------------------------------------------------------
# Les deux parcours
# ---------------------------------------------------------------------------

parcourir "" >"$TEMPORAIRE/passe-1"
parcourir "" >"$TEMPORAIRE/passe-2"
parcourir "sort=recent" >"$TEMPORAIRE/passe-explicite"

# ---------------------------------------------------------------------------
# Le même parcours, deux fois, pour chacun des tris proposés
# ---------------------------------------------------------------------------
#
# Le courriel du 8 septembre demande la démonstration sur le catalogue ; elle
# ne vaut que si elle porte sur *tous* les ordres offerts, pas seulement sur
# celui par défaut. La liste des tris est lue dans le contrat publié plutôt
# que recopiée ici : un tri ajouté à `openapi.yaml` sans clé de départage
# entre dans cette boucle tout seul, et en sort en échec.
TRIS="$(
  sed -n 's/^ *enum: \[\(recent[^]]*\)\]$/\1/p' "$RACINE/packages/api/openapi.yaml" |
    head -1 | tr -d ' ' | tr ',' ' '
)"

if [ -z "$TRIS" ]; then
  echo "Impossible de lire la liste des tris dans openapi.yaml." >&2
  exit 1
fi

# Plus large que $LIMITE : douze parcours complets à trois profils par page
# feraient deux mille requêtes pour la même démonstration. Vingt est le
# plafond que le serveur applique de toute façon, et vingt-et-quelques pages
# traversent largement assez de bornes.
LIMITE_TRIS=20
TRIS_RESULTAT=""

for tri in $TRIS; do
  parcourir "sort=$tri" "$LIMITE_TRIS" >"$TEMPORAIRE/tri-$tri-1"
  parcourir "sort=$tri" "$LIMITE_TRIS" >"$TEMPORAIRE/tri-$tri-2"

  lignes="$(wc -l <"$TEMPORAIRE/tri-$tri-1" | tr -d ' ')"
  uniques="$(sort -u "$TEMPORAIRE/tri-$tri-1" | wc -l | tr -d ' ')"

  if diff -q "$TEMPORAIRE/tri-$tri-1" "$TEMPORAIRE/tri-$tri-2" >/dev/null; then
    identiques="identiques"
  else
    identiques="DIFFÉRENTES"
  fi

  TRIS_RESULTAT="$TRIS_RESULTAT$tri|$identiques|$lignes|$uniques
"
done

TOTAL_API="$(catalogue "page=1&limit=$LIMITE" | jq -r '.pagination.total')"
PAGES_API="$(catalogue "page=1&limit=$LIMITE" | jq -r '.pagination.pages')"

LIGNES_1="$(wc -l <"$TEMPORAIRE/passe-1" | tr -d ' ')"
LIGNES_2="$(wc -l <"$TEMPORAIRE/passe-2" | tr -d ' ')"
DOUBLONS="$(sort "$TEMPORAIRE/passe-1" | uniq -d)"
UNIQUES="$(sort -u "$TEMPORAIRE/passe-1" | wc -l | tr -d ' ')"

PROFILS_EN_BASE="$(psql_dev -c 'SELECT count(*) FROM "Profile";')"

PROFILS_VISIBLES="$(psql_dev_in <<SQL
SELECT count(*) FROM "Profile" p JOIN "User" u ON u.id = p."userId" WHERE $VISIBLE_SQL;
SQL
)"

# The rows the catalogue is not allowed to show, named one by one rather than
# subtracted, so the gap between the two counts is not left to the reader's
# trust.
EXCLUS="$(psql_dev_in <<SQL
SELECT p.id || E'\t' || CASE
         WHEN u.role <> 'APPLICANT' THEN 'compte non candidat'
         WHEN NOT u."isActive" THEN 'compte désactivé'
         ELSE 'profil rejeté par la modération'
       END
  FROM "Profile" p JOIN "User" u ON u.id = p."userId"
 WHERE NOT ($VISIBLE_SQL)
 ORDER BY p.id;
SQL
)"

# The ordering key read back from Postgres, so the sequence can be checked by
# eye against the columns it claims to be ordered by.
psql_dev_in >"$TEMPORAIRE/cles" <<SQL
SELECT p.id || E'\t' || to_char(p."updatedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS')
  FROM "Profile" p JOIN "User" u ON u.id = p."userId"
 WHERE $VISIBLE_SQL
 ORDER BY p."updatedAt" DESC, p.id ASC;
SQL

entete_sequence() {
  local fichier="$1" titre="$2"
  {
    printf '%s\n' "$titre"
    printf 'ProfilsActifs — JEB/DNI/2026-003 — courriel du 8 septembre 2026\n'
    printf '\n'
    printf 'date      : %s\n' "$(date --iso-8601=seconds)"
    printf 'commit    : %s\n' "$(git -C "$RACINE" rev-parse HEAD)"
    printf 'branche   : %s\n' "$(git -C "$RACINE" rev-parse --abbrev-ref HEAD)"
    printf 'requête   : GET /recruiter/catalogue?page=N&limit=%s (aucun tri demandé)\n' "$LIMITE"
    printf 'tri       : updatedAt DESC, id ASC — le tri par défaut\n'
    printf 'pages     : %s, parcourues de la première à la dernière\n' "$PAGES_API"
    printf '\n'
    printf 'Un identifiant de profil par ligne, dans l ordre où le catalogue les a rendus.\n'
    printf -- '------------------------------------------------------------------------------\n'
  } >"$fichier"
}

entete_sequence "$PASSE_1" "EW-9 — parcours complet du catalogue, passe 1"
cat "$TEMPORAIRE/passe-1" >>"$PASSE_1"

entete_sequence "$PASSE_2" "EW-9 — parcours complet du catalogue, passe 2"
cat "$TEMPORAIRE/passe-2" >>"$PASSE_2"

# ---------------------------------------------------------------------------
# La modification concurrente, provoquée exprès
# ---------------------------------------------------------------------------

# The last id of page 1 and the last id overall: touching the second one moves
# it to the head of the order, which is precisely the case the email describes.
DERNIER_PAGE_1="$(sed -n "${LIMITE}p" "$TEMPORAIRE/passe-1")"
CIBLE="$(tail -n 1 "$TEMPORAIRE/passe-1")"
CIBLE_HORODATAGE="$(psql_dev_in <<SQL
SELECT to_char("updatedAt", 'YYYY-MM-DD"T"HH24:MI:SS.US') FROM "Profile" WHERE id = '$CIBLE';
SQL
)"

restaurer_cible() {
  psql_dev_in >/dev/null <<SQL
UPDATE "Profile" SET "updatedAt" = '$CIBLE_HORODATAGE'::timestamp WHERE id = '$CIBLE';
SQL
}
trap 'restaurer_cible; rm -rf "$TEMPORAIRE"' EXIT

catalogue "page=1&limit=$LIMITE" | jq -r '.data[].id' >"$TEMPORAIRE/interrompu-page-1"

# The recruiter has read page 1. The candidate saves their profile now.
psql_dev_in >/dev/null <<SQL
UPDATE "Profile" SET "updatedAt" = now() WHERE id = '$CIBLE';
SQL

catalogue "page=2&limit=$LIMITE" | jq -r '.data[].id' >"$TEMPORAIRE/interrompu-page-2"

cat "$TEMPORAIRE/interrompu-page-1" "$TEMPORAIRE/interrompu-page-2" >"$TEMPORAIRE/interrompu-vu"
head -n $((LIMITE * 2)) "$TEMPORAIRE/passe-1" >"$TEMPORAIRE/interrompu-attendu"

VUS_DEUX_FOIS="$(sort "$TEMPORAIRE/interrompu-vu" | uniq -d)"
JAMAIS_VUS="$(comm -23 <(sort "$TEMPORAIRE/interrompu-attendu") <(sort "$TEMPORAIRE/interrompu-vu"))"

restaurer_cible
trap 'rm -rf "$TEMPORAIRE"' EXIT

# ---------------------------------------------------------------------------
# La transcription
# ---------------------------------------------------------------------------

preuve_init "$SORTIE"
preuve_entete "EW-9 — tri déterministe du catalogue : deux parcours et leur comparaison" \
  "$API_URL" "$RACINE"
journal "courriel    : 8 septembre 2026 — « deux exécutions, ça se prouve en trois minutes »"
journal "page        : limit=$LIMITE, choisi pour que le parcours traverse $PAGES_API pages"
journal ""
journal "Fichiers joints :"
journal "  docs/preuves/EW-9-tri-passe-1.txt   — la séquence obtenue au premier parcours"
journal "  docs/preuves/EW-9-tri-passe-2.txt   — la séquence obtenue au second"
journal "  ce fichier                          — leur comparaison"

journal ""
journal "=============================================================================="
journal "1. L'ordre annoncé"
journal "------------------------------------------------------------------------------"
journal "ORDER BY \"updatedAt\" DESC, \"id\" ASC — deux colonnes, la seconde unique."
journal ""
journal "Il est construit par buildCatalogueOrderBy() dans"
journal "packages/api/src/services/catalogue.filters.ts, appliqué par défaut par le"
journal "validateur (packages/api/src/validators/recruiter.ts) et publié dans"
journal "packages/api/openapi.yaml. Index correspondant, colonne pour colonne :"
journal ""
psql_dev_in <<'SQL' | sed 's/^/  /' >>"$SORTIE"
SELECT indexdef FROM pg_indexes
 WHERE tablename = 'Profile' AND indexname = 'Profile_updatedAt_id_idx';
SQL

journal ""
journal "Plan d'exécution réellement choisi pour la requête de page :"
journal ""
docker compose -f "$RACINE/docker-compose.yml" exec -T "$SERVICE_BASE" \
  psql -q -v ON_ERROR_STOP=1 -U "$UTILISATEUR" -d "$BASE" <<SQL | sed 's/^/  /' >>"$SORTIE"
EXPLAIN SELECT p.id
  FROM "Profile" p JOIN "User" u ON u.id = p."userId"
 WHERE $VISIBLE_SQL
 ORDER BY p."updatedAt" DESC, p.id ASC
 LIMIT $LIMITE;
SQL

journal ""
journal "Ce plan porte un nœud Sort, et il faut le dire plutôt que le passer sous"
journal "silence : sur $PROFILS_EN_BASE lignes, lire la table entière coûte moins cher que"
journal "descendre l'index, et le planificateur a raison. L'index n'est pas décoratif"
journal "pour autant — il sert bien l'ordre demandé, ce qui se vérifie en retirant au"
journal "planificateur le parcours séquentiel. Le nœud Sort disparaît :"
journal ""
docker compose -f "$RACINE/docker-compose.yml" exec -T "$SERVICE_BASE" \
  psql -q -v ON_ERROR_STOP=1 -U "$UTILISATEUR" -d "$BASE" <<SQL | sed 's/^/  /' >>"$SORTIE"
SET enable_seqscan = off;
EXPLAIN SELECT p.id FROM "Profile" p ORDER BY p."updatedAt" DESC, p.id ASC LIMIT $LIMITE;
RESET enable_seqscan;
SQL
journal ""
journal "Les mesures au volume de recette (50 000 profils) sont dans"
journal "docs/preuves/EW-5-index-catalogue.txt et docs/decisions/02-index-du-catalogue.md."
journal ""
journal "Le déterminisme, lui, ne dépend d'aucun de ces deux plans : il tient à ce que"
journal "l'ORDER BY porte une clé unique en dernière position, donc à ce qu'aucune"
journal "paire de lignes ne soit à égalité. Un changement de plan réordonne le travail,"
journal "pas le résultat."

journal ""
journal "=============================================================================="
journal "2. Combien de profils le catalogue doit rendre"
journal "------------------------------------------------------------------------------"
journal "Compté sur la base, pas sur l'API :"
journal ""
constat 'lignes dans "Profile"' "$PROFILS_EN_BASE"
constat 'que le catalogue a le droit de montrer' "$PROFILS_VISIBLES"
constat "pagination.total rendu par l'API" "$TOTAL_API"
journal ""
journal "L'écart entre les deux premiers nombres n'est pas une perte : ce sont les"
journal "lignes que les règles de visibilité écartent (packages/api/src/services/"
journal "visibility.ts). Elles sont nommées une par une :"
journal ""
if [ -n "$EXCLUS" ]; then
  printf '%s\n' "$EXCLUS" | sed 's/^/  /' >>"$SORTIE"
else
  journal "  (aucune)"
fi

journal ""
journal "=============================================================================="
journal "3. Les deux parcours et leur comparaison"
journal "------------------------------------------------------------------------------"
journal "\$ diff docs/preuves/EW-9-tri-passe-1.txt docs/preuves/EW-9-tri-passe-2.txt"
journal ""
if diff -u "$TEMPORAIRE/passe-1" "$TEMPORAIRE/passe-2" >>"$SORTIE"; then
  journal "  (aucune différence — les deux séquences sont identiques, ligne pour ligne)"
  IDENTIQUES="oui"
else
  IDENTIQUES="NON"
fi

journal ""
journal "constat :"
constat 'séquences identiques' "$IDENTIQUES"
constat 'identifiants rendus, passe 1' "$LIGNES_1"
constat 'identifiants rendus, passe 2' "$LIGNES_2"
constat 'identifiants distincts' "$UNIQUES"
constat 'doublons' "$([ -z "$DOUBLONS" ] && echo "aucun" || printf '%s' "$DOUBLONS" | tr '\n' ' ')"
constat 'manquants par rapport à la base' "$((PROFILS_VISIBLES - UNIQUES))"
constat "compte attendu ($PROFILS_VISIBLES) atteint" "$([ "$LIGNES_1" = "$PROFILS_VISIBLES" ] && echo "oui" || echo "NON")"

journal ""
journal "Le tri par défaut est bien celui qui est documenté : la même séquence est"
journal "obtenue sans paramètre \`sort\` et avec \`sort=recent\` explicite."
journal ""
if diff -q "$TEMPORAIRE/passe-1" "$TEMPORAIRE/passe-explicite" >/dev/null; then
  constat 'défaut implicite == sort=recent' 'oui'
else
  constat 'défaut implicite == sort=recent' 'NON'
fi

journal ""
journal "Séquence obtenue, avec la clé de tri lue en base en regard :"
journal ""
journal "    #  identifiant                updatedAt"
nl -ba -w3 -s'  ' "$TEMPORAIRE/cles" | sed 's/\t/  /' | sed 's/^/  /' >>"$SORTIE"

journal ""
journal "=============================================================================="
journal "4. Un profil modifié pendant que le recruteur pagine"
journal "------------------------------------------------------------------------------"
journal "Le cas est provoqué exprès, pas attendu : le recruteur lit la page 1, le"
journal "candidat $CIBLE enregistre son profil, le recruteur demande la page 2."
journal "L'horodatage d'origine est remis en place à la fin du script."
journal ""
constat 'dernier profil de la page 1' "$DERNIER_PAGE_1"
constat 'profil modifié entre les deux pages' "$CIBLE"
journal "  (il était le dernier de l'ordre, il passe en tête)"
journal ""
journal "  pages 1 puis 2, sans interruption — attendu :"
sed 's/^/    /' "$TEMPORAIRE/interrompu-attendu" >>"$SORTIE"
journal "  pages 1 puis 2, avec la modification :"
sed 's/^/    /' "$TEMPORAIRE/interrompu-vu" >>"$SORTIE"
journal ""
constat 'vus deux fois' "$([ -z "$VUS_DEUX_FOIS" ] && echo "aucun" || printf '%s' "$VUS_DEUX_FOIS" | tr '\n' ' ')"
constat 'jamais vus' "$([ -z "$JAMAIS_VUS" ] && echo "aucun" || printf '%s' "$JAMAIS_VUS" | tr '\n' ' ')"
journal ""
journal "C'est le comportement attendu d'une pagination par OFFSET, et il est"
journal "documenté plutôt que masqué : docs/livrables/note-algorithme-de-classement.md"
journal "§4 dit quelle garantie nous offrons et laquelle nous n'offrons pas."
journal ""
journal "  horodatage restauré pour $CIBLE :"
journal "    $(psql_dev_in <<SQL
SELECT to_char("updatedAt", 'YYYY-MM-DD"T"HH24:MI:SS.US') FROM "Profile" WHERE id = '$CIBLE';
SQL
)"
journal "    (valeur d'origine : $CIBLE_HORODATAGE)"

journal ""
journal "=============================================================================="
journal "5. Chacun des tris proposés, parcouru deux fois"
journal "------------------------------------------------------------------------------"
journal "La démonstration du §3 porte sur l'ordre par défaut. Elle est reprise ici"
journal "pour chaque valeur de \`sort\` que le contrat publie, à $LIMITE_TRIS profils par"
journal "page. Un tri dont les deux parcours divergeraient, ou qui rendrait un"
journal "identifiant deux fois, apparaîtrait dans ce tableau."
journal ""
journal "    tri              deux parcours    rendus  distincts"
printf '%s' "$TRIS_RESULTAT" | while IFS='|' read -r tri etat lignes uniques; do
  [ -n "$tri" ] || continue
  printf '    %-16s %-16s %6s  %9s\n' "$tri" "$etat" "$lignes" "$uniques" >>"$SORTIE"
done
journal ""
constat 'tris vérifiés' "$(printf '%s' "$TRIS_RESULTAT" | grep -c '|')"
constat 'tris dont les deux parcours divergent' \
  "$(printf '%s' "$TRIS_RESULTAT" | grep -c 'DIFFÉRENTES' || true)"
journal ""
journal "Chacun se termine sur \`id\`, ce que deux tests unitaires tiennent en"
journal "itérant CATALOGUE_SORTS plutôt qu'une liste écrite à la main"
journal "(packages/api/src/services/catalogue.filters.test.ts)."

journal ""
journal "=============================================================================="
journal "Fin de la transcription — $(date --iso-8601=seconds)"

echo "Séquences écrites dans $PASSE_1 et $PASSE_2"
echo "Comparaison écrite dans $SORTIE"
