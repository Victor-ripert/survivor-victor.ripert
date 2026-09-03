#!/usr/bin/env bash
#
# EW-3 — rejoue les cinq réponses d'erreur exigées par le §8.1 (400, 401, 403,
# 404, 422) contre une API réellement démarrée, et écrit la transcription
# brute dans docs/preuves/.
#
#   npm run db:seed            # les comptes de démonstration doivent exister
#   npm run dev -w @profils-actifs/api
#   ./scripts/preuves/erreurs-http.sh
#
# Rien n'est recomposé : chaque bloc ci-dessous est la sortie de `curl -i`
# telle qu'elle est revenue. Seul le jeton porteur est masqué — il est envoyé
# via la variable $TOKEN_CANDIDAT, que le script résout mais n'imprime pas.

set -euo pipefail

API_URL="${API_URL:-http://localhost:3000/api}"
COMPTE_CANDIDAT="${COMPTE_CANDIDAT:-yanis.oubrahim@example.fr}"
MOT_DE_PASSE="${MOT_DE_PASSE:-Password123!}"

SORTIE="$(cd "$(dirname "$0")/../.." && pwd)/docs/preuves/EW-3-erreurs-http.txt"

# `curl -i` sur une API arrêtée échoue avec un message réseau qu'on ne veut pas
# voir passer pour une preuve : on vérifie d'abord qu'il y a quelqu'un au bout.
if ! curl -sSf -o /dev/null "$API_URL/health"; then
  echo "API injoignable sur $API_URL — démarrez-la avant de rejouer les preuves." >&2
  exit 1
fi

# ---------------------------------------------------------------- préparation
# Ces trois appels ne sont pas des preuves, ils fabriquent l'état que les
# preuves interrogent : un jeton candidat, une tentative ouverte, et l'id
# d'une question à choix unique.
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

ATTEMPT_ID="$(
  curl -sS -X POST "$API_URL/certification/attempt" \
    -H "Authorization: Bearer $TOKEN_CANDIDAT" |
    jq -r '.id'
)"

QUESTION_QCM="$(
  curl -sS "$API_URL/certification/questions" |
    jq -r 'first(.[] | select(.type == "MULTIPLE_CHOICE") | .id)'
)"

if [ -z "$ATTEMPT_ID" ] || [ "$ATTEMPT_ID" = "null" ] ||
  [ -z "$QUESTION_QCM" ] || [ "$QUESTION_QCM" = "null" ]; then
  echo "Impossible de préparer la tentative ou de trouver une question MULTIPLE_CHOICE." >&2
  exit 1
fi

# ------------------------------------------------------------------- capture
: >"$SORTIE"

journal() { printf '%s\n' "$*" >>"$SORTIE"; }

# Rend un argument recopiable dans un shell : entre apostrophes dès qu'il porte
# autre chose que des caractères sûrs, sans quoi la commande imprimée ne
# reproduit pas l'appel réellement passé.
citer() {
  case "$1" in
  *[!A-Za-z0-9_/.:=@%+-]*) printf "'%s'" "${1//\'/\'\\''}" ;;
  *) printf '%s' "$1" ;;
  esac
}

# Imprime la commande telle qu'elle est lancée, puis sa sortie brute. Le jeton
# reste sous forme de variable dans la trace, sa valeur n'y apparaît jamais.
capture() {
  local titre="$1" attendu="$2"
  shift 2

  local commande="curl -i" argument
  for argument in "$@"; do
    commande+=" $(citer "$argument")"
  done

  journal ""
  journal "=============================================================================="
  journal "$titre"
  journal "attendu : $attendu"
  journal "------------------------------------------------------------------------------"
  journal "\$ $commande"
  journal ""

  local rendu=("$@") index
  for index in "${!rendu[@]}"; do
    rendu[index]="${rendu[index]//\$TOKEN_CANDIDAT/$TOKEN_CANDIDAT}"
  done

  curl -sS -i "${rendu[@]}" >>"$SORTIE"
  journal ""
}

journal "EW-3 — preuves des réponses d'erreur (§8.1)"
journal "ProfilsActifs — JEB/DNI/2026-003"
journal ""
journal "date        : $(date --iso-8601=seconds)"
journal "commit      : $(git rev-parse HEAD)"
journal "branche     : $(git rev-parse --abbrev-ref HEAD)"
journal "API         : $API_URL"
journal "version API : $(curl -sS "$API_URL/health" | jq -r '.version')"
journal "compte      : $COMPTE_CANDIDAT (compte de démonstration issu du seed)"
journal ""
journal "Le jeton porteur est passé par \$TOKEN_CANDIDAT et n'est pas imprimé."
journal "Tout le reste est la sortie brute de curl."

capture "400 — corps de requête invalide" \
  "validation_error : questionId manquant, décidable en lisant le corps seul" \
  -X POST "$API_URL/certification/attempt/$ATTEMPT_ID/answer" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN_CANDIDAT' \
  -d '{}'

capture "401 — absence d'authentification" \
  "unauthorized : aucun en-tête Authorization" \
  "$API_URL/auth/me"

capture "403 — rôle insuffisant" \
  "forbidden : un candidat n'accède pas au catalogue recruteur" \
  "$API_URL/recruiter/catalogue" \
  -H 'Authorization: Bearer $TOKEN_CANDIDAT'

capture "404 — ressource inexistante" \
  "not_found : cette tentative n'existe pas" \
  "$API_URL/certification/attempt/tentative-qui-nexiste-pas" \
  -H 'Authorization: Bearer $TOKEN_CANDIDAT'

capture "422 — corps valide, incompatible avec la ressource visée" \
  "unprocessable_entity : question MULTIPLE_CHOICE, optionId absent" \
  -X POST "$API_URL/certification/attempt/$ATTEMPT_ID/answer" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN_CANDIDAT' \
  -d "{\"questionId\":\"$QUESTION_QCM\"}"

journal ""
journal "=============================================================================="
journal "Fin de la transcription — $(date --iso-8601=seconds)"

echo "Transcription écrite dans $SORTIE"
