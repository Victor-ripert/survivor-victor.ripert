#!/usr/bin/env bash
#
# VI-3 — capture qu'une page hors bornes du flux public (§8.6) rend un
# résultat vide propre : 200, `data: []`, et une `pagination.total` qui
# reflète toujours le nombre réel de profils, pas zéro.
#
#   npm run db:seed
#   npm run dev -w @profils-actifs/api
#   ./scripts/preuves/pagination-hors-bornes.sh
#
# La page 1 est capturée d'abord, pour donner un total de référence auquel
# comparer la page hors bornes — sans lui, `data: []` à lui seul ne prouve
# rien de plus qu'une page vide par accident.

set -euo pipefail

API_URL="${API_URL:-http://localhost:3000/api}"

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/preuve-http.sh
source "$RACINE/scripts/preuves/lib/preuve-http.sh"

SORTIE="$RACINE/docs/preuves/VI-3-pagination-hors-bornes.txt"

preuve_verifier_api "$API_URL"
preuve_init "$SORTIE"
preuve_entete "VI-3 — pagination hors bornes sur le flux public (§8.6)" "$API_URL" "$RACINE"
journal ""

preuve_capture "GET /profiles?page=1 — page de référence" \
  "200, data non vide, pagination.total = nombre réel de profils publics" \
  "$API_URL/profiles?page=1"

TOTAL_REFERENCE="$(curl -sS "$API_URL/profiles?page=1" | jq -r '.pagination.total')"

PAGE_HORS_BORNES=9999

preuve_capture "GET /profiles?page=$PAGE_HORS_BORNES — page hors bornes" \
  "200, data: [], pagination.total = $TOTAL_REFERENCE (inchangé), pas d'erreur" \
  "$API_URL/profiles?page=$PAGE_HORS_BORNES"

CORPS_HORS_BORNES="$(curl -sS "$API_URL/profiles?page=$PAGE_HORS_BORNES")"
DATA_VIDE="$(printf '%s' "$CORPS_HORS_BORNES" | jq -c '.data == []')"
TOTAL_HORS_BORNES="$(printf '%s' "$CORPS_HORS_BORNES" | jq -r '.pagination.total')"
PAGE_RENVOYEE="$(printf '%s' "$CORPS_HORS_BORNES" | jq -r '.pagination.page')"

journal "constat :"
journal "  data: []                         : $DATA_VIDE"
journal "  pagination.total inchangé        : $([ "$TOTAL_HORS_BORNES" = "$TOTAL_REFERENCE" ] && echo "oui ($TOTAL_HORS_BORNES)" || echo "NON ($TOTAL_HORS_BORNES attendu $TOTAL_REFERENCE)")"
journal "  pagination.page reflète la requête : $([ "$PAGE_RENVOYEE" = "$PAGE_HORS_BORNES" ] && echo "oui ($PAGE_RENVOYEE)" || echo "NON ($PAGE_RENVOYEE)")"

journal ""
journal "=============================================================================="
journal "Fin de la transcription — $(date --iso-8601=seconds)"

echo "Transcription écrite dans $SORTIE"
