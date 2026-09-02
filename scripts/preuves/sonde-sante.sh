#!/usr/bin/env bash
#
# EW-4 — capture /api/health en 200, puis en 503 après avoir réellement coupé
# la base, puis de nouveau en 200 une fois celle-ci relancée.
#
#   npm run dev -w @profils-actifs/api
#   ./scripts/preuves/sonde-sante.sh
#
# Le §8.2 demande une sonde qui vérifie quelque chose de vrai. La preuve n'est
# donc pas la réponse dégradée elle-même : c'est le fait que la coupure la
# provoque et que le rétablissement la lève, sans redémarrer l'API.

set -euo pipefail

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
API_URL="${API_URL:-http://localhost:3000/api}"
SERVICE_BASE="${SERVICE_BASE:-postgres}"
SORTIE="$RACINE/docs/preuves/EW-4-sonde-sante.txt"

# Un `docker compose stop` laisse le conteneur arrêté si le script meurt entre
# les deux captures. On le relance quoi qu'il arrive.
relancer_base() {
  docker compose -f "$RACINE/docker-compose.yml" start "$SERVICE_BASE" >/dev/null 2>&1 || true
}
trap relancer_base EXIT

if ! curl -sSf -o /dev/null "$API_URL/health"; then
  echo "API injoignable sur $API_URL — démarrez-la avant de rejouer les preuves." >&2
  exit 1
fi

: >"$SORTIE"
journal() { printf '%s\n' "$*" >>"$SORTIE"; }

etape() {
  journal ""
  journal "=============================================================================="
  journal "$1"
  journal "------------------------------------------------------------------------------"
  journal "\$ $2"
  journal ""
}

# La sonde interroge la base à chaque appel : sans attente, la première requête
# après un `start` peut arriver avant que Postgres n'accepte les connexions.
attendre_sonde() {
  local attendu="$1" tentative
  for tentative in $(seq 1 30); do
    if [ "$(curl -sS -o /dev/null -w '%{http_code}' "$API_URL/health")" = "$attendu" ]; then
      return 0
    fi
    sleep 1
  done
  echo "La sonde n'a jamais répondu $attendu." >&2
  return 1
}

journal "EW-4 — preuves de la sonde de santé (§8.2)"
journal "ProfilsActifs — JEB/DNI/2026-003"
journal ""
journal "date    : $(date --iso-8601=seconds)"
journal "commit  : $(git -C "$RACINE" rev-parse HEAD)"
journal "branche : $(git -C "$RACINE" rev-parse --abbrev-ref HEAD)"
journal "API     : $API_URL"
journal ""
journal "L'API n'est pas redémarrée entre les trois captures : seule la base bouge."

etape "1. Base disponible — attendu 200" "curl -i $API_URL/health"
curl -sS -i "$API_URL/health" >>"$SORTIE"
journal ""

etape "2. Coupure de la base" "docker compose stop $SERVICE_BASE"
docker compose -f "$RACINE/docker-compose.yml" stop "$SERVICE_BASE" >>"$SORTIE" 2>&1
journal ""

attendre_sonde 503

etape "3. Base injoignable — attendu 503" "curl -i $API_URL/health"
curl -sS -i "$API_URL/health" >>"$SORTIE"
journal ""

etape "4. Rétablissement de la base" "docker compose start $SERVICE_BASE"
docker compose -f "$RACINE/docker-compose.yml" start "$SERVICE_BASE" >>"$SORTIE" 2>&1
journal ""

attendre_sonde 200

etape "5. Retour à la normale, sans redémarrer l'API — attendu 200" "curl -i $API_URL/health"
curl -sS -i "$API_URL/health" >>"$SORTIE"
journal ""

journal "=============================================================================="
journal "Fin de la transcription — $(date --iso-8601=seconds)"

echo "Transcription écrite dans $SORTIE"
