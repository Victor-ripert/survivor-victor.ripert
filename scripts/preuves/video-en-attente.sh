#!/usr/bin/env bash
#
# SOIR-2 — une vidéo en attente de validation ne doit apparaître nulle part.
#
#   ./scripts/preuves/video-en-attente.sh AVANT
#   …changement de code, rebuild, redémarrage…
#   ./scripts/preuves/video-en-attente.sh APRÈS
#
# Le script n'invente pas son sujet : il prend la vidéo réellement en
# `PENDING` dans la base, et regarde ce que l'API en dit. Chaque bloc porte le
# commit contre lequel il a été produit, ce qui rend le avant/après
# vérifiable — sans quoi deux captures côte à côte ne prouvent rien.
#
# §7.9.2 de l'addendum : « une vidéo en attente ne doit être accessible par
# aucun moyen », et le retrait couvre ce que le serveur renvoie, pas seulement
# ce que la page affiche.

set -euo pipefail

PHASE="${1:-}"
if [ -z "$PHASE" ]; then
  echo "usage: $0 AVANT|APRÈS" >&2
  exit 1
fi

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
API_URL="${API_URL:-http://localhost:3000/api}"
COMPTE_RECRUTEUR="${COMPTE_RECRUTEUR:-recruteur@profils-actifs.fr}"
MOT_DE_PASSE="${MOT_DE_PASSE:-Password123!}"
SERVICE_BASE="${SERVICE_BASE:-postgres}"
SORTIE="$RACINE/docs/preuves/SOIR-2-video-en-attente.txt"
SOURCE_FILTRE="$RACINE/packages/api/src/services/catalogue.filters.ts"

if ! curl -sSf -o /dev/null "$API_URL/health"; then
  echo "API injoignable sur $API_URL." >&2
  exit 1
fi

psql_dev() {
  docker compose -f "$RACINE/docker-compose.yml" exec -T "$SERVICE_BASE" \
    psql -tAq -v ON_ERROR_STOP=1 -U profils_user -d profils_actifs_dev "$@"
}

# La première exécution crée le fichier et son en-tête ; la seconde ajoute son
# bloc à la suite.
if [ ! -f "$SORTIE" ]; then
  {
    echo "SOIR-2 — une vidéo en attente ne doit apparaître nulle part (§7.9.2)"
    echo "ProfilsActifs — JEB/DNI/2026-003"
    echo ""
    echo "Sujet : la vidéo réellement en PENDING dans la base de développement."
    echo "Les deux blocs ci-dessous sont produits par le même script, contre la"
    echo "même base et le même compte recruteur ; seul le code change entre eux."
  } >"$SORTIE"
fi

journal() { printf '%s\n' "$*" >>"$SORTIE"; }

VIDEO_ID="$(psql_dev -c "select id from \"Video\" where \"moderationStatus\" = 'PENDING' order by id limit 1;")"
if [ -z "$VIDEO_ID" ]; then
  echo "Aucune vidéo PENDING en base — rejouez npm run db:seed." >&2
  exit 1
fi

VIDEO_URL="$(psql_dev -c "select url from \"Video\" where id = '$VIDEO_ID';")"
CANDIDAT="$(psql_dev -c "select u.\"lastName\" from \"Video\" v join \"Profile\" p on p.id = v.\"profileId\" join \"User\" u on u.id = p.\"userId\" where v.id = '$VIDEO_ID';")"

TOKEN="$(
  curl -sS -X POST "$API_URL/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$COMPTE_RECRUTEUR\",\"password\":\"$MOT_DE_PASSE\"}" | jq -r '.token'
)"

CATALOGUE="$(curl -sS "$API_URL/recruiter/catalogue?limit=20" -H "Authorization: Bearer $TOKEN")"
FICHE="$(printf '%s' "$CATALOGUE" | jq --arg n "$CANDIDAT" '.data[] | select(.lastName == $n) | {firstName, lastName, videoCount, previewVideo}')"
AVEC_VIDEO="$(
  curl -sS "$API_URL/recruiter/catalogue?limit=20&hasVideo=true" -H "Authorization: Bearer $TOKEN" |
    jq --arg n "$CANDIDAT" '[.data[] | select(.lastName == $n)] | length'
)"

# Le test qui compte : l'URL de la vidéo en attente apparaît-elle, où que ce
# soit, dans ce que le serveur a renvoyé ?
if printf '%s' "$CATALOGUE" | grep -qF "$VIDEO_URL"; then
  FUITE="OUI — l'adresse de la vidéo en attente est présente dans la réponse"
  SERVEUR_FILTRE="not REJECTED"
else
  FUITE="non — l'adresse n'apparaît nulle part dans la réponse"
  SERVEUR_FILTRE="APPROVED"
fi

# Garde-fou contre la preuve la plus facile à produire par accident : un
# serveur resté sur l'ancien binaire pendant que le fichier source, lui, porte
# déjà le changement. La capture aurait l'air d'un « avant » alors que le dépôt
# dit « après ». On compare donc ce que la source déclare et ce que le serveur
# fait, et on refuse d'écrire quoi que ce soit s'ils divergent.
if grep -q 'moderationStatus: ModerationStatus.APPROVED' "$SOURCE_FILTRE"; then
  SOURCE_ATTENDUE="APPROVED"
else
  SOURCE_ATTENDUE="not REJECTED"
fi

if [ "$SOURCE_ATTENDUE" != "$SERVEUR_FILTRE" ]; then
  echo "Incohérence : la source dit « $SOURCE_ATTENDUE », le serveur se comporte en « $SERVEUR_FILTRE »." >&2
  echo "L'API ne tourne pas sur ce code. Reconstruisez et redémarrez avant de rejouer :" >&2
  echo "  npm run build && pkill -f '^node dist/index.js' ; (cd packages/api && npm start &)" >&2
  exit 1
fi

journal ""
journal "=============================================================================="
journal "$PHASE"
journal "=============================================================================="
journal "date      : $(date --iso-8601=seconds)"
journal "commit    : $(git -C "$RACINE" rev-parse HEAD)"
journal "filtre    : publishedVideoFilter = $SOURCE_ATTENDUE (source et comportement du serveur concordent)"
journal ""
journal "Vidéo sujet : $VIDEO_ID (candidat $CANDIDAT)"
journal "Statut      : $(psql_dev -c "select \"moderationStatus\" from \"Video\" where id = '$VIDEO_ID';")"
journal "Adresse     : $VIDEO_URL"
journal ""
journal "--- GET /recruiter/catalogue?limit=20 — la fiche du candidat -------------------"
journal "$FICHE"
journal ""
journal "--- GET /recruiter/catalogue?hasVideo=true — le candidat y figure-t-il ? -------"
journal "occurrences : $AVEC_VIDEO"
journal ""
journal "--- L'adresse de la vidéo fuit-elle dans la réponse du catalogue ? -------------"
journal "$FUITE"

echo "Bloc « $PHASE » ajouté à $SORTIE"
