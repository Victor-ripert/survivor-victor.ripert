#!/usr/bin/env bash
#
# EW-6 — vérifie que les trois représentations du modèle disent la même chose :
# le schéma Prisma, le dossier de migrations, et la base réellement en place.
#
#   docker compose up -d postgres && npm run db:migrate
#   ./scripts/preuves/schema-conforme.sh
#
# Le §8.2 demande un livrable de schéma qui corresponde aux migrations réelles
# et pas à l'intention. Deux diffs suffisent à l'établir :
#
#   A. schéma → base       : ce qui tourne est bien ce que le schéma décrit
#   B. migrations → schéma : rejouer le dossier de migrations depuis une base
#                            vide reconstruit exactement ce schéma
#
# B est le contrôle qui manque le plus souvent : un `db push` en catimini rend
# A vert alors que le dossier de migrations ne reconstruit plus rien.

set -euo pipefail

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
SERVICE_BASE="${SERVICE_BASE:-postgres}"
UTILISATEUR="${UTILISATEUR:-profils_user}"
BASE_MIROIR="${BASE_MIROIR:-profils_actifs_shadow}"
SORTIE="$RACINE/docs/preuves/EW-6-schema-conforme.txt"

# shellcheck disable=SC1091
set -a && . "$RACINE/.env.local" && set +a

# `migrate diff --from-migrations` rejoue les migrations dans une base jetable.
# Elle est créée ici et supprimée en sortie, quoi qu'il arrive.
psql_admin() {
  docker compose -f "$RACINE/docker-compose.yml" exec -T "$SERVICE_BASE" \
    psql -v ON_ERROR_STOP=1 -U "$UTILISATEUR" -d postgres "$@"
}

supprimer_miroir() { psql_admin -q -c "DROP DATABASE IF EXISTS \"$BASE_MIROIR\";" >/dev/null 2>&1 || true; }
trap supprimer_miroir EXIT

supprimer_miroir
psql_admin -q -c "CREATE DATABASE \"$BASE_MIROIR\";"

export SHADOW_DATABASE_URL="${DATABASE_URL%/*}/$BASE_MIROIR"

: >"$SORTIE"
journal() { printf '%s\n' "$*" >>"$SORTIE"; }

journal "EW-6 — conformité schéma / migrations / base (§8.2)"
journal "ProfilsActifs — JEB/DNI/2026-003"
journal ""
journal "date    : $(date --iso-8601=seconds)"
journal "commit  : $(git -C "$RACINE" rev-parse HEAD)"
journal "branche : $(git -C "$RACINE" rev-parse --abbrev-ref HEAD)"
journal ""

journal "=============================================================================="
journal "A. Le schéma décrit-il la base en place ?"
journal "------------------------------------------------------------------------------"
journal "\$ prisma migrate diff --from-schema=prisma/schema.prisma --to-config-datasource --exit-code"
journal ""
(cd "$RACINE/packages/db" && npx prisma migrate diff \
  --from-schema=prisma/schema.prisma --to-config-datasource --exit-code) >>"$SORTIE" 2>&1
journal "code de sortie : 0 (aucune différence ; 2 signalerait une dérive)"

journal ""
journal "=============================================================================="
journal "B. Rejouer les migrations reconstruit-il ce schéma ?"
journal "------------------------------------------------------------------------------"
journal "\$ prisma migrate diff --from-migrations=prisma/migrations --to-schema=prisma/schema.prisma --exit-code"
journal ""
(cd "$RACINE/packages/db" && npx prisma migrate diff \
  --from-migrations=prisma/migrations --to-schema=prisma/schema.prisma --exit-code) >>"$SORTIE" 2>&1
journal "code de sortie : 0 (aucune différence)"

journal ""
journal "=============================================================================="
journal "Migrations appliquées à la base"
journal "------------------------------------------------------------------------------"
docker compose -f "$RACINE/docker-compose.yml" exec -T "$SERVICE_BASE" \
  psql -q -v ON_ERROR_STOP=1 -U "$UTILISATEUR" -d "${DATABASE_URL##*/}" \
  -c "SELECT migration_name, finished_at, applied_steps_count FROM _prisma_migrations ORDER BY started_at;" >>"$SORTIE"

journal ""
journal "=============================================================================="
journal "Index réellement en place"
journal "------------------------------------------------------------------------------"
docker compose -f "$RACINE/docker-compose.yml" exec -T "$SERVICE_BASE" \
  psql -q -v ON_ERROR_STOP=1 -U "$UTILISATEUR" -d "${DATABASE_URL##*/}" \
  -c "SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;" >>"$SORTIE"

journal ""
journal "Fin de la transcription — $(date --iso-8601=seconds)"

echo "Transcription écrite dans $SORTIE"
