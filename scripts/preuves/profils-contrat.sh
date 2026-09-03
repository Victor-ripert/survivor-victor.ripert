#!/usr/bin/env bash
#
# VI-2 — rejoue les quatre routes du contrôleur profils (GET /profiles,
# GET /profiles/{id}, GET /profiles/me, POST /profiles/me) contre une API
# réellement démarrée, et vérifie qu'aucune ne renvoie un champ que le
# schéma `Profile` d'openapi.yaml ne déclare pas.
#
#   npm run db:seed
#   npm run dev -w @profils-actifs/api
#   ./scripts/preuves/profils-contrat.sh
#
# Le contrat documente déjà `POST /profiles/me` comme upsert — il n'y a pas
# de PATCH à réconcilier, seulement la forme des réponses à vérifier. La
# liste de champs attendue n'est pas recopiée à la main : elle vient de
# scripts/preuves/lib/openapi-schema.mts, qui la lit dans openapi.yaml.
#
# L'appel POST rejoue en entrée les valeurs déjà lues en sortie de GET
# /profiles/me — un aller-retour sans effet, pour ne pas altérer le profil
# de démonstration à chaque exécution.

set -euo pipefail

API_URL="${API_URL:-http://localhost:3000/api}"
COMPTE_CANDIDAT="${COMPTE_CANDIDAT:-amina.berthier@example.fr}"
MOT_DE_PASSE="${MOT_DE_PASSE:-Password123!}"

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
SORTIE="$RACINE/docs/preuves/VI-2-profils-contrat.txt"

if ! curl -sSf -o /dev/null "$API_URL/health"; then
  echo "API injoignable sur $API_URL — démarrez-la avant de rejouer les preuves." >&2
  exit 1
fi

# ---------------------------------------------------------------- préparation
TOKEN_CANDIDAT="$(
  curl -sS -X POST "$API_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$COMPTE_CANDIDAT\",\"password\":\"$MOT_DE_PASSE\"}" |
    jq -r '.token'
)"

if [ -z "$TOKEN_CANDIDAT" ] || [ "$TOKEN_CANDIDAT" = "null" ]; then
  echo "Connexion impossible pour $COMPTE_CANDIDAT — lancez d'abord npm run db:seed." >&2
  exit 1
fi

PROFILE_ID="$(curl -sS "$API_URL/profiles?limit=1" | jq -r '.data[0].id // empty')"

if [ -z "$PROFILE_ID" ]; then
  echo "Aucun profil public dans le flux — lancez d'abord npm run db:seed." >&2
  exit 1
fi

# Champs déclarés par le schéma Profile — une seule lecture du contrat, tout
# le script diffuse la même référence.
SCHEMA_PROFILE="$(npx tsx "$RACINE/scripts/preuves/lib/openapi-schema.mts" Profile)"
CHAMPS_DECLARES="$(printf '%s' "$SCHEMA_PROFILE" | jq -r '.properties[]' | sort)"
CHAMPS_REQUIS="$(printf '%s' "$SCHEMA_PROFILE" | jq -r '.required[]' | sort)"

: >"$SORTIE"
journal() { printf '%s\n' "$*" >>"$SORTIE"; }

# Rend un argument recopiable dans un shell (mêmes règles que erreurs-http.sh).
citer() {
  case "$1" in
  *[!A-Za-z0-9_/.:=@%+-]*) printf "'%s'" "${1//\'/\'\\''}" ;;
  *) printf '%s' "$1" ;;
  esac
}

# Compare les clés de premier niveau d'une réponse JSON à la référence tirée
# du contrat. Un champ hors schéma est toujours une non-conformité ; un champ
# requis absent aussi. Un champ optionnel absent ne l'est pas : le mapper
# API laisse `undefined` disparaître du JSON pour tout champ facultatif que
# ce profil ne renseigne pas (voir toProfileDto dans utils/mappers.ts) — ce
# n'est donc pas un défaut de forme, juste une valeur non renseignée.
verifier_champs() {
  local corps="$1"
  local observes en_trop manquants_requis

  observes="$(printf '%s' "$corps" | jq -r 'keys | .[]' | sort)"
  en_trop="$(comm -13 <(printf '%s\n' "$CHAMPS_DECLARES") <(printf '%s\n' "$observes"))"
  manquants_requis="$(comm -23 <(printf '%s\n' "$CHAMPS_REQUIS") <(printf '%s\n' "$observes"))"

  journal "  conforme au schéma Profile : $([ -z "$en_trop$manquants_requis" ] && echo oui || echo NON)"
  if [ -n "$en_trop" ]; then
    journal "  champs hors schéma       : $(echo "$en_trop" | tr '\n' ' ')"
  fi
  if [ -n "$manquants_requis" ]; then
    journal "  champs requis absents    : $(echo "$manquants_requis" | tr '\n' ' ')"
  fi
}

# Imprime la commande telle qu'elle est lancée, la transcription -i brute
# dans le journal, puis lance le diff de champs sur le corps JSON réel — deux
# appels réseau par route (un -i pour la preuve lisible, un -s pour le jq qui
# suit), jamais une réponse recomposée à la main.
capture_et_verifier() {
  local titre="$1" chemin_json="$2"
  shift 2

  local commande="curl -i" argument
  for argument in "$@"; do
    commande+=" $(citer "$argument")"
  done

  journal ""
  journal "=============================================================================="
  journal "$titre"
  journal "------------------------------------------------------------------------------"
  journal "\$ $commande"
  journal ""

  local rendu=("$@") index
  for index in "${!rendu[@]}"; do
    rendu[index]="${rendu[index]//\$TOKEN_CANDIDAT/$TOKEN_CANDIDAT}"
  done

  curl -sS -i "${rendu[@]}" >>"$SORTIE"
  journal ""

  local corps
  corps="$(curl -sS "${rendu[@]}" | jq -c "$chemin_json")"
  verifier_champs "$corps"
}

journal "VI-2 — contrôleur et routes profils, conformité au contrat (openapi.yaml)"
journal "ProfilsActifs — JEB/DNI/2026-003"
journal ""
journal "date        : $(date --iso-8601=seconds)"
journal "commit      : $(git -C "$RACINE" rev-parse HEAD)"
journal "branche     : $(git -C "$RACINE" rev-parse --abbrev-ref HEAD)"
journal "API         : $API_URL"
journal "version API : $(curl -sS "$API_URL/health" | jq -r '.version')"
journal "compte      : $COMPTE_CANDIDAT (compte de démonstration issu du seed, profil complet)"
journal ""
journal "Champs déclarés par le schéma Profile : $(echo "$CHAMPS_DECLARES" | tr '\n' ' ')"
journal "Le jeton porteur est passé par \$TOKEN_CANDIDAT et n'est pas imprimé."

capture_et_verifier "GET /profiles — flux public (élément [0] de data)" '.data[0]' \
  "$API_URL/profiles?limit=1"

capture_et_verifier "GET /profiles/{id} — profil public" '.' \
  "$API_URL/profiles/$PROFILE_ID"

capture_et_verifier "GET /profiles/me — profil authentifié" '.' \
  "$API_URL/profiles/me" \
  -H 'Authorization: Bearer $TOKEN_CANDIDAT'

# Aller-retour sans effet : on renvoie en entrée ce que GET /profiles/me a
# rendu en sortie, pour ne pas modifier le profil de démonstration.
MOI="$(curl -sS "$API_URL/profiles/me" -H "Authorization: Bearer $TOKEN_CANDIDAT")"
CORPS_UPSERT="$(printf '%s' "$MOI" | jq -c '{headline, bio, location, sector}')"

journal ""
journal "=============================================================================="
journal "POST /profiles/me — upsert (verbe documenté par le contrat, pas PATCH)"
journal "------------------------------------------------------------------------------"
journal "\$ curl -i -X POST $API_URL/profiles/me -H 'Authorization: Bearer \$TOKEN_CANDIDAT' -d '$CORPS_UPSERT'"
journal ""
curl -sS -i -X POST "$API_URL/profiles/me" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN_CANDIDAT" \
  -d "$CORPS_UPSERT" >>"$SORTIE"
journal ""

CORPS_REPONSE="$(
  curl -sS -X POST "$API_URL/profiles/me" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOKEN_CANDIDAT" \
    -d "$CORPS_UPSERT"
)"
verifier_champs "$CORPS_REPONSE"

journal ""
journal "=============================================================================="
journal "Fin de la transcription — $(date --iso-8601=seconds)"

echo "Transcription écrite dans $SORTIE"
