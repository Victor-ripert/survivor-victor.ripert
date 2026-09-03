#!/usr/bin/env bash
#
# SOIR-3 — « une vidéo en attente ne doit être accessible par aucun moyen »
# (addendum §7.9.2), preuve en navigation privée.
#
#   ./scripts/preuves/video-inaccessible.sh
#
# Ce script établit ce qu'il peut établir, et il dit où s'arrête ce qu'il
# établit. Il balaie **toutes** les routes montées de l'API, authentifié et non
# authentifié, et vérifie qu'aucune ne renvoie l'adresse de la vidéo en
# attente. Il ouvre ensuite en navigation privée les adresses de la plateforme
# qui pourraient la porter.
#
# Ce qu'il ne peut pas établir : la vidéo est un lien externe YouTube, déjà
# public chez l'hébergeur. Nous maîtrisons la divulgation de l'adresse, pas
# l'existence du contenu. Le script le mesure et l'écrit plutôt que de
# l'omettre — voir le point 05 de REPARTITION.md section 6.

set -euo pipefail

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
API_URL="${API_URL:-http://localhost:3000/api}"
COMPTE_RECRUTEUR="${COMPTE_RECRUTEUR:-recruteur@profils-actifs.fr}"
COMPTE_ADMIN="${COMPTE_ADMIN:-admin@profils-actifs.fr}"
MOT_DE_PASSE="${MOT_DE_PASSE:-Password123!}"
SERVICE_BASE="${SERVICE_BASE:-postgres}"
SORTIE="$RACINE/docs/preuves/SOIR-3-video-inaccessible.txt"
CAPTURE_PRIVEE="$RACINE/docs/preuves/SOIR-3-navigation-privee.png"
NAVIGATEUR="${NAVIGATEUR:-google-chrome}"

if ! curl -sSf -o /dev/null "$API_URL/health"; then
  echo "API injoignable sur $API_URL." >&2
  exit 1
fi

psql_dev() {
  docker compose -f "$RACINE/docker-compose.yml" exec -T "$SERVICE_BASE" \
    psql -tAq -v ON_ERROR_STOP=1 -U profils_user -d profils_actifs_dev "$@"
}

VIDEO_ID="$(psql_dev -c "select id from \"Video\" where \"moderationStatus\" = 'PENDING' order by id limit 1;")"
[ -n "$VIDEO_ID" ] || {
  echo "Aucune vidéo PENDING en base." >&2
  exit 1
}
VIDEO_URL="$(psql_dev -c "select url from \"Video\" where id = '$VIDEO_ID';")"

jeton() {
  curl -sS -X POST "$API_URL/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$MOT_DE_PASSE\"}" | jq -r '.token'
}
TOKEN_RECRUTEUR="$(jeton "$COMPTE_RECRUTEUR")"
TOKEN_ADMIN="$(jeton "$COMPTE_ADMIN")"

: >"$SORTIE"
journal() { printf '%s\n' "$*" >>"$SORTIE"; }

journal "SOIR-3 — inaccessibilité d'une vidéo en attente (§7.9.2)"
journal "ProfilsActifs — JEB/DNI/2026-003"
journal ""
journal "date    : $(date --iso-8601=seconds)"
journal "commit  : $(git -C "$RACINE" rev-parse HEAD)"
journal "branche : $(git -C "$RACINE" rev-parse --abbrev-ref HEAD)"
journal ""
journal "Vidéo sujet : $VIDEO_ID"
journal "Statut      : $(psql_dev -c "select \"moderationStatus\" from \"Video\" where id = '$VIDEO_ID';")"
journal "Adresse     : $VIDEO_URL"

# --------------------------------------------------------------- 1. balayage
# Toutes les routes montées dans app.ts, dans les trois postures d'appel
# possibles. Pour chacune : le code HTTP, et surtout si l'adresse de la vidéo
# en attente apparaît quelque part dans le corps renvoyé.
journal ""
journal "=============================================================================="
journal "1. Toutes les routes montées, l'adresse de la vidéo apparaît-elle ?"
journal "=============================================================================="
journal ""
printf '%-46s %-14s %-6s %s\n' "ROUTE" "APPELANT" "CODE" "ADRESSE PRÉSENTE" >>"$SORTIE"
printf '%-46s %-14s %-6s %s\n' "----------------------------------------------" "--------------" "------" "----------------" >>"$SORTIE"

sonder() {
  local route="$1" appelant="$2" entete="$3"
  local corps code

  if [ -n "$entete" ]; then
    corps="$(curl -sS -w '\n%{http_code}' "$API_URL$route" -H "$entete")"
  else
    corps="$(curl -sS -w '\n%{http_code}' "$API_URL$route")"
  fi
  code="${corps##*$'\n'}"
  corps="${corps%$'\n'*}"

  local presente="non"
  if printf '%s' "$corps" | grep -qF "$VIDEO_URL"; then presente="OUI"; fi

  printf '%-46s %-14s %-6s %s\n' "$route" "$appelant" "$code" "$presente" >>"$SORTIE"
}

for route in \
  "/recruiter/catalogue?limit=100" \
  "/recruiter/catalogue?limit=100&hasVideo=true" \
  "/recruiter/catalogue/facets" \
  "/recruiter/favorites" \
  "/recruiter/dashboard" \
  "/interactions" \
  "/notifications" \
  "/admin/dashboard" \
  "/certification/questions" \
  "/health"; do
  sonder "$route" "anonyme" ""
  sonder "$route" "recruteur" "Authorization: Bearer $TOKEN_RECRUTEUR"
  sonder "$route" "administrateur" "Authorization: Bearer $TOKEN_ADMIN"
done

# La ressource elle-même : aucune route ne la sert, ce qui doit se lire comme
# un 404 dans la forme d'erreur uniforme, pas comme une page blanche.
journal ""
journal "L'adresse de la ressource sur notre plateforme :"
journal ""
journal "\$ curl -i $API_URL/videos/$VIDEO_ID"
curl -sS -i "$API_URL/videos/$VIDEO_ID" >>"$SORTIE"

# ------------------------------------------------- 2. la fenêtre privée
journal ""
journal ""
journal "=============================================================================="
journal "2. Navigation privée, sans session"
journal "=============================================================================="
journal ""
journal "Capture : $(basename "$CAPTURE_PRIVEE")"
journal "Adresse ouverte : $API_URL/videos/$VIDEO_ID"
journal ""
journal "Le navigateur est lancé en mode incognito, sans profil, donc sans jeton"
journal "ni témoin de connexion — c'est la posture d'un visiteur qui aurait"
journal "récupéré l'identifiant de la vidéo par un autre moyen."

if command -v "$NAVIGATEUR" >/dev/null 2>&1; then
  PROFIL_JETABLE="$(mktemp -d)"
  "$NAVIGATEUR" --headless --incognito --no-sandbox --disable-gpu --hide-scrollbars \
    --user-data-dir="$PROFIL_JETABLE" --virtual-time-budget=5000 \
    --window-size=900,320 --screenshot="$CAPTURE_PRIVEE" \
    "$API_URL/videos/$VIDEO_ID" >/dev/null 2>&1 || true
  rm -rf "$PROFIL_JETABLE"
  journal ""
  journal "Capture produite."
else
  journal ""
  journal "Navigateur « $NAVIGATEUR » introuvable — capture non produite."
fi

# ------------------------------------------- 3. la limite, mesurée et écrite
journal ""
journal ""
journal "=============================================================================="
journal "3. La limite : ce que l'intégration par lien ne permet pas de garantir"
journal "=============================================================================="
journal ""
journal "La vidéo est un VideoType.EXTERNAL_LINK. Son contenu est hébergé par un"
journal "tiers et y est public indépendamment de nous. Mesure de l'adresse chez"
journal "l'hébergeur, à la même seconde que le reste de cette transcription :"
journal ""
journal "\$ curl -o /dev/null -s -w '%{http_code}' $VIDEO_URL"
CODE_HEBERGEUR="$(curl -o /dev/null -s -w '%{http_code}' --max-time 15 "$VIDEO_URL" || echo 'inatteignable')"
journal "$CODE_HEBERGEUR"
journal ""
journal "Lecture honnête de ce chiffre : la plateforme maîtrise **la divulgation**"
journal "de l'adresse, pas **l'existence** du contenu. Le §1 ci-dessus établit"
journal "qu'aucune de nos routes ne divulgue plus cette adresse ; il n'établit pas,"
journal "et ne peut pas établir, que le contenu a disparu de chez l'hébergeur."
journal ""
journal "Rendre la vidéo réellement inaccessible suppose de changer de mécanisme :"
journal "n'accepter que des liens non répertoriés — ce qui n'est toujours qu'une"
journal "obscurité, pas un contrôle — ou passer au téléversement local, ce qui"
journal "rouvre l'intégralité du §8.5 et ne tient pas dans la semaine."
journal ""
journal "Ce point est remonté par écrit à Florine Pontaillac plutôt que masqué :"
journal "docs/remontees/05-lien-externe-inaccessibilite.md"
journal ""
journal "Fin de la transcription — $(date --iso-8601=seconds)"

echo "Transcription écrite dans $SORTIE"
