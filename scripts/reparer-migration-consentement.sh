#!/usr/bin/env bash
#
# Répare une base de développement bloquée par la migration
# 20260902133533_add_video_consent, sans la vider.
#
#   ./scripts/reparer-migration-consentement.sh
#
# Le problème : cette migration ajoute `Video.acceptedAt` et
# `Video.consentTextVersion` en NOT NULL sans valeur par défaut. Sur une base
# vide — celle de la CI — elle passe. Sur une base qui contient déjà des vidéos
# — celle de tout le monde — PostgreSQL refuse :
#
#   ERROR: column "acceptedAt" of relation "Video" contains null values
#
# Et une migration en échec bloque toutes les suivantes. `prisma migrate reset`
# règle le problème en détruisant la base ; ce script fait le même travail en
# la gardant.
#
# Il applique ce que la migration aurait fait si elle avait été écrite pour une
# table non vide : ajouter les colonnes en nullable, les remplir à partir de
# `createdAt` — la date de dépôt est la meilleure approximation disponible de la
# date de consentement pour des lignes antérieures à la mesure —, puis poser la
# contrainte. La valeur de `createdAt` est reprise ensuite par la migration
# 20260902142731_restore_video_created_at, si bien qu'aucun horodatage n'est
# perdu.
#
# À ne jamais lancer sur une base de production : il inscrit une migration
# comme appliquée sans l'avoir exécutée telle quelle.

set -euo pipefail

RACINE="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_BASE="${SERVICE_BASE:-postgres}"
UTILISATEUR="${UTILISATEUR:-profils_user}"
BASE="${BASE:-profils_actifs_dev}"
MIGRATION="20260902133533_add_video_consent"
VERSION_CONSENTEMENT="${VERSION_CONSENTEMENT:-v1.0}"

psql_base() {
  docker compose -f "$RACINE/docker-compose.yml" exec -T "$SERVICE_BASE" \
    psql -v ON_ERROR_STOP=1 -U "$UTILISATEUR" -d "$BASE" "$@"
}

deja_applique="$(psql_base -tAc "select count(*) from _prisma_migrations where migration_name = '$MIGRATION' and finished_at is not null;")"
if [ "$deja_applique" != "0" ]; then
  echo "La migration $MIGRATION est déjà appliquée sur $BASE — rien à faire."
  exit 0
fi

echo "Réparation de $BASE…"

psql_base <<SQL
BEGIN;

-- 1. Les colonnes, d'abord en nullable pour que l'ALTER passe sur des lignes
--    existantes.
ALTER TABLE "Video"
  ADD COLUMN IF NOT EXISTS "acceptedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consentTextVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "revokedAt"          TIMESTAMP(3);

-- 2. Le remplissage. Pour une vidéo déposée avant l'existence du consentement
--    journalisé, la date de dépôt est la seule date honnête disponible ; la
--    version du texte est celle en vigueur.
UPDATE "Video"
   SET "acceptedAt"         = COALESCE("acceptedAt", "createdAt"),
       "consentTextVersion" = COALESCE("consentTextVersion", '$VERSION_CONSENTEMENT')
 WHERE "acceptedAt" IS NULL OR "consentTextVersion" IS NULL;

-- 3. La contrainte, maintenant qu'aucune ligne ne viole.
ALTER TABLE "Video"
  ALTER COLUMN "acceptedAt"         SET NOT NULL,
  ALTER COLUMN "consentTextVersion" SET NOT NULL;

-- 4. Ce que la migration d'origine fait aussi. La colonne est réintroduite par
--    la migration suivante, qui reprend sa valeur depuis "acceptedAt".
ALTER TABLE "Video" DROP COLUMN IF EXISTS "createdAt";

COMMIT;
SQL

echo "Colonnes en place. Marquage de la migration comme appliquée…"
(cd "$RACINE/packages/db" && npx prisma migrate resolve --applied "$MIGRATION")

echo ""
echo "Terminé. Enchaînez avec :"
echo "  npm run db:migrate     # applique les migrations suivantes"
echo "  npm run db:seed"
