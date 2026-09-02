#!/usr/bin/env bash
#
# EW-5 — mesure l'effet des index du catalogue sur les trois critères cités
# dans le mail de Thomas Vignal : secteur, localisation, compétences.
#
#   docker compose up -d postgres
#   ./scripts/preuves/index-catalogue.sh
#
# La base de développement ne porte que douze profils : à cette taille le
# planificateur balaye la table quoi qu'il arrive et la mesure ne dirait rien.
# Le script construit donc une base de mesure dédiée, y charge 50 000 profils,
# joue les EXPLAIN ANALYZE sur le schéma d'avant, applique la migration, et
# rejoue exactement les mêmes requêtes. Les deux séries portent sur les mêmes
# lignes.
#
# Les trois requêtes ci-dessous ne sont pas réécrites à la main : ce sont
# celles que Prisma émet, relevées par scripts/preuves/capturer-sql-catalogue.mts.
# Seuls les paramètres liés ont été remplacés par leurs valeurs, pour que
# l'EXPLAIN se lise sans PREPARE.

set -euo pipefail

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
SERVICE_BASE="${SERVICE_BASE:-postgres}"
UTILISATEUR="${UTILISATEUR:-profils_user}"
BASE_MESURE="${BASE_MESURE:-profils_actifs_bench}"
PROFILS="${PROFILS:-50000}"
SORTIE="$RACINE/docs/preuves/EW-5-index-catalogue.txt"

MIGRATION_INIT="$RACINE/packages/db/prisma/migrations/20260831150606_init/migration.sql"
MIGRATION_INDEX="$RACINE/packages/db/prisma/migrations/20260902093737_catalogue_search_indexes/migration.sql"

for fichier in "$MIGRATION_INIT" "$MIGRATION_INDEX"; do
  [ -f "$fichier" ] || {
    echo "Migration introuvable : $fichier" >&2
    exit 1
  }
done

psql_bench() {
  docker compose -f "$RACINE/docker-compose.yml" exec -T "$SERVICE_BASE" \
    psql -v ON_ERROR_STOP=1 -U "$UTILISATEUR" -d "$BASE_MESURE" "$@"
}

psql_admin() {
  docker compose -f "$RACINE/docker-compose.yml" exec -T "$SERVICE_BASE" \
    psql -v ON_ERROR_STOP=1 -U "$UTILISATEUR" -d postgres "$@"
}

: >"$SORTIE"
journal() { printf '%s\n' "$*" >>"$SORTIE"; }

# --------------------------------------------------------------- les requêtes
REQUETE_SECTEUR='SELECT "public"."Profile"."id" FROM "public"."Profile" LEFT JOIN "public"."User" AS "j0" ON ("j0"."id") = ("public"."Profile"."userId") WHERE ("public"."Profile"."moderationStatus" <> CAST('"'"'REJECTED'"'"'::text AS "public"."ModerationStatus") AND ("j0"."isActive" = true AND "j0"."role" = CAST('"'"'APPLICANT'"'"'::text AS "public"."UserRole") AND ("j0"."id" IS NOT NULL)) AND "public"."Profile"."sector" ILIKE '"'"'Informatique'"'"') ORDER BY "public"."Profile"."updatedAt" DESC, "public"."Profile"."id" ASC LIMIT 20 OFFSET 0'

REQUETE_LOCALISATION='SELECT "public"."Profile"."id" FROM "public"."Profile" LEFT JOIN "public"."User" AS "j0" ON ("j0"."id") = ("public"."Profile"."userId") WHERE ("public"."Profile"."moderationStatus" <> CAST('"'"'REJECTED'"'"'::text AS "public"."ModerationStatus") AND ("j0"."isActive" = true AND "j0"."role" = CAST('"'"'APPLICANT'"'"'::text AS "public"."UserRole") AND ("j0"."id" IS NOT NULL)) AND "public"."Profile"."location" ILIKE '"'"'Lyon'"'"') ORDER BY "public"."Profile"."updatedAt" DESC, "public"."Profile"."id" ASC LIMIT 20 OFFSET 0'

REQUETE_COMPETENCES='SELECT "public"."Profile"."id" FROM "public"."Profile" LEFT JOIN "public"."User" AS "j0" ON ("j0"."id") = ("public"."Profile"."userId") WHERE ("public"."Profile"."moderationStatus" <> CAST('"'"'REJECTED'"'"'::text AS "public"."ModerationStatus") AND ("j0"."isActive" = true AND "j0"."role" = CAST('"'"'APPLICANT'"'"'::text AS "public"."UserRole") AND ("j0"."id" IS NOT NULL)) AND EXISTS(SELECT "t1"."profileId" FROM "public"."ProfileSkill" AS "t1" LEFT JOIN "public"."Skill" AS "j2" ON ("j2"."id") = ("t1"."skillId") WHERE ("j2"."name" ILIKE '"'"'React'"'"' AND ("j2"."id" IS NOT NULL) AND ("public"."Profile"."id") = ("t1"."profileId") AND "t1"."profileId" IS NOT NULL))) ORDER BY "public"."Profile"."updatedAt" DESC, "public"."Profile"."id" ASC LIMIT 20 OFFSET 0'

# La recherche libre `q`, mesurée elle aussi : elle est le seul critère du
# catalogue dont on ne pouvait pas prédire le plan sur le papier. Relevée après
# le retrait du nom du candidat de la recherche — d'où une seule jointure sur
# User au lieu de trois.
REQUETE_RECHERCHE='SELECT "public"."Profile"."id" FROM "public"."Profile" LEFT JOIN "public"."User" AS "j0" ON ("j0"."id") = ("public"."Profile"."userId") WHERE ("public"."Profile"."moderationStatus" <> CAST('"'"'REJECTED'"'"'::text AS "public"."ModerationStatus") AND ("j0"."isActive" = true AND "j0"."role" = CAST('"'"'APPLICANT'"'"'::text AS "public"."UserRole") AND ("j0"."id" IS NOT NULL)) AND ("public"."Profile"."headline" ILIKE '"'"'%react%'"'"' OR "public"."Profile"."bio" ILIKE '"'"'%react%'"'"' OR "public"."Profile"."sector" ILIKE '"'"'%react%'"'"' OR "public"."Profile"."location" ILIKE '"'"'%react%'"'"' OR EXISTS(SELECT "t1"."profileId" FROM "public"."ProfileSkill" AS "t1" LEFT JOIN "public"."Skill" AS "j2" ON ("j2"."id") = ("t1"."skillId") WHERE ("j2"."name" ILIKE '"'"'%react%'"'"' AND ("j2"."id" IS NOT NULL) AND ("public"."Profile"."id") = ("t1"."profileId") AND "t1"."profileId" IS NOT NULL)))) ORDER BY "public"."Profile"."updatedAt" DESC, "public"."Profile"."id" ASC LIMIT 20 OFFSET 0'

mesurer() {
  local phase="$1"

  local titre requete
  for titre in secteur localisation competences recherche; do
    case "$titre" in
    secteur) requete="$REQUETE_SECTEUR" ;;
    localisation) requete="$REQUETE_LOCALISATION" ;;
    competences) requete="$REQUETE_COMPETENCES" ;;
    recherche) requete="$REQUETE_RECHERCHE" ;;
    esac

    journal ""
    journal "------------------------------------------------------------------------------"
    journal "$phase — critère : $titre"
    journal "------------------------------------------------------------------------------"
    # BUFFERS montre si la lecture vient du cache ou du disque : sans lui, un
    # écart de temps peut n'être qu'un effet de cache chaud.
    printf 'EXPLAIN (ANALYZE, BUFFERS) %s;\n' "$requete" | psql_bench -q >>"$SORTIE"
  done
}

# ------------------------------------------------------------------ le décor
echo "Construction de la base de mesure $BASE_MESURE ($PROFILS profils)…"

psql_admin -q -c "DROP DATABASE IF EXISTS \"$BASE_MESURE\";" -c "CREATE DATABASE \"$BASE_MESURE\";"

# Le schéma d'avant : la migration initiale seule, sans les index mesurés.
psql_bench -q <"$MIGRATION_INIT"

psql_bench -q <<SQL
-- Graine fixe : les dates ci-dessous sont tirées au hasard mais le tirage est
-- reproductible d'une exécution à l'autre.
SELECT setseed(0.42);

INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
SELECT 'u' || g, 'compte' || g || '@mesure.local', 'non-utilise', 'Prenom' || g, 'Nom' || g,
       'APPLICANT'::"UserRole", true, now() - (g || ' minutes')::interval, now() - (g || ' minutes')::interval
FROM generate_series(1, $PROFILS) g;

-- 200 localisations et 40 secteurs : une valeur donnée couvre donc 0,5 % et
-- 2,5 % de la table. C'est l'ordre de grandeur d'une plateforme nationale, et
-- c'est la zone où le choix seq scan / index se joue réellement.
INSERT INTO "Profile" (id, "userId", headline, bio, location, sector, "certificationStatus", "certificationScore", "moderationStatus", "createdAt", "updatedAt")
SELECT 'p' || g, 'u' || g, 'Titre ' || g, 'Presentation ' || g,
       CASE WHEN (g % 200) < 12
            THEN (ARRAY['Lyon','Paris','Marseille','Toulouse','Nantes','Lille','Bordeaux','Rennes','Strasbourg','Nice','Montpellier','Grenoble'])[1 + (g % 200)]
            ELSE 'Commune-' || (g % 200) END,
       CASE WHEN (g % 40) < 10
            THEN (ARRAY['Informatique','Santé','Logistique','Industrie','Commerce','Éducation','Bâtiment','Finance','Tourisme','Agriculture'])[1 + (g % 40)]
            ELSE 'Secteur-' || (g % 40) END,
       'COMPLETED'::"CertificationStatus", (g % 101), 'APPROVED'::"ModerationStatus",
       -- Date de mise à jour tirée au hasard, et surtout décorrélée du secteur
       -- et de la localisation. Une date dérivée du même compteur que ceux-ci
       -- ferait s'intercaler parfaitement les lignes retenues dans l'ordre de
       -- tri, ce qui est le meilleur cas possible pour un parcours d'index
       -- ordonné et fausserait la comparaison en sa faveur.
       now() - ((random() * 500000)::int || ' minutes')::interval,
       now() - ((random() * 500000)::int || ' minutes')::interval
FROM generate_series(1, $PROFILS) g;

INSERT INTO "Skill" (id, name)
SELECT 's' || g,
       CASE WHEN g <= 10
            THEN (ARRAY['React','TypeScript','Node.js','SQL','Docker','Python','Java','Design UI','Communication','Gestion de projet'])[g]
            ELSE 'Compétence-' || g END
FROM generate_series(1, 300) g;

-- Trois compétences par profil. Les trois décalages diffèrent toujours modulo
-- 300, donc la contrainte d'unicité (profileId, skillId) tient.
INSERT INTO "ProfileSkill" (id, "profileId", "skillId", level)
SELECT 'ps' || g || '-' || k, 'p' || g, 's' || (1 + ((g * 7 + k * 53) % 300)), 'INTERMEDIATE'::"SkillLevel"
FROM generate_series(1, $PROFILS) g, generate_series(0, 2) k;

ANALYZE;
SQL

# ------------------------------------------------------------------ mesures
journal "EW-5 — index du catalogue : mesures avant et après (§8.2 + mail)"
journal "ProfilsActifs — JEB/DNI/2026-003"
journal ""
journal "date         : $(date --iso-8601=seconds)"
journal "commit       : $(git -C "$RACINE" rev-parse HEAD)"
journal "branche      : $(git -C "$RACINE" rev-parse --abbrev-ref HEAD)"
journal "base         : $BASE_MESURE ($PROFILS profils, 150 000 lignes ProfileSkill, 300 compétences)"
journal "PostgreSQL   : $(psql_bench -tAq -c 'SHOW server_version;')"
journal ""
journal "Les requêtes sont celles émises par Prisma, relevées avec"
journal "scripts/preuves/capturer-sql-catalogue.mts ; seuls les paramètres liés"
journal "sont remplacés par leurs valeurs."

journal ""
journal "=============================================================================="
journal "AVANT — schéma de la migration initiale (btree sur sector et location)"
journal "=============================================================================="
journal ""
journal "Index présents sur Profile, ProfileSkill et Skill :"
psql_bench -q -c "SELECT tablename, indexname, indexdef FROM pg_indexes WHERE tablename IN ('Profile','ProfileSkill','Skill') ORDER BY tablename, indexname;" >>"$SORTIE"

mesurer "AVANT"

# ---------------------------------------------------------------- migration
echo "Application de la migration des index…"
psql_bench -q <"$MIGRATION_INDEX"
# VACUUM, pas seulement ANALYZE : un index GIN garde les entrées récemment
# insérées dans une liste d'attente que le planificateur refuse de traverser,
# et seul un VACUUM la vide. Sans lui, la mesure « après » sous-estime l'index.
psql_bench -q -c "VACUUM ANALYZE;"

journal ""
journal "=============================================================================="
journal "APRÈS — migration $(basename "$(dirname "$MIGRATION_INDEX")") appliquée"
journal "=============================================================================="
journal ""
journal "Index présents sur Profile, ProfileSkill et Skill :"
psql_bench -q -c "SELECT tablename, indexname, indexdef FROM pg_indexes WHERE tablename IN ('Profile','ProfileSkill','Skill') ORDER BY tablename, indexname;" >>"$SORTIE"

mesurer "APRÈS"

journal ""
journal "=============================================================================="
journal "Coût en espace des index ajoutés"
journal "=============================================================================="
psql_bench -q -c "SELECT indexrelname AS index, pg_size_pretty(pg_relation_size(indexrelid)) AS taille FROM pg_stat_user_indexes WHERE relname IN ('Profile','ProfileSkill','Skill') ORDER BY pg_relation_size(indexrelid) DESC;" >>"$SORTIE"

# ------------------------------------------------------- un autre ordre de tri
# Sur le tri par défaut (`recent`), le planificateur préfère parcourir
# Profile_updatedAt_idx et filtrer au vol : le LIMIT 20 s'arrête tôt. Ce tri
# n'est pas le seul, et dès qu'il change, ce raccourci disparaît. Cette annexe
# montre lequel des deux index porte alors la requête.
journal ""
journal "=============================================================================="
journal "ANNEXE A — le même filtre secteur, trié par score (sort=score)"
journal "=============================================================================="
journal ""
psql_bench -q >>"$SORTIE" <<'SQL'
EXPLAIN (ANALYZE, BUFFERS) SELECT "Profile"."id" FROM "Profile" LEFT JOIN "User" AS "j0" ON ("j0"."id") = ("Profile"."userId")
WHERE ("Profile"."moderationStatus" <> 'REJECTED'::"ModerationStatus" AND ("j0"."isActive" = true AND "j0"."role" = 'APPLICANT'::"UserRole" AND ("j0"."id" IS NOT NULL)) AND "Profile"."sector" ILIKE 'Informatique')
ORDER BY "Profile"."certificationScore" DESC NULLS LAST, "Profile"."updatedAt" DESC, "Profile"."id" ASC LIMIT 20 OFFSET 0;
SQL

# ----------------------------------------------- croissance du référentiel
# Le référentiel de compétences compte 300 entrées ici. À cette taille la table
# tient dans une poignée de pages et le balayage gagne toujours : l'index
# trigramme sur Skill.name ne sert donc à rien aujourd'hui. La question est de
# savoir à partir de quand il sert — d'où cette annexe.
journal ""
journal "=============================================================================="
journal "ANNEXE B — le même référentiel de compétences porté à 5 000 entrées"
journal "=============================================================================="
journal ""
journal "Recherche d'une compétence par son nom, insensible à la casse :"
psql_bench -q <<'SQL' >>"$SORTIE"
INSERT INTO "Skill" (id, name)
SELECT 's' || g, 'Compétence-' || g FROM generate_series(301, 5000) g;
VACUUM ANALYZE "Skill";
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Skill" WHERE name ILIKE 'React';
SQL

# ------------------------------------------------ compétence peu répandue
# Le jeu de mesure répartit les compétences uniformément : chacune est portée
# par 1 % des profils, et le planificateur choisit alors un bitmap qui repasse
# toujours par la table. C'est le cas où le composite n'apporte rien. Une
# compétence rare — le cas réel d'un métier de niche — change ce plan.
journal ""
journal "=============================================================================="
journal "ANNEXE C — une compétence portée par 5 profils sur 50 000"
journal "=============================================================================="
journal ""
psql_bench -q >>"$SORTIE" <<'SQL'
INSERT INTO "Skill" (id, name) VALUES ('s-rare', 'Compétence rare');
INSERT INTO "ProfileSkill" (id, "profileId", "skillId", level)
SELECT 'psr' || g, 'p' || g, 's-rare', 'INTERMEDIATE'::"SkillLevel" FROM generate_series(40001, 40005) g;
VACUUM ANALYZE "ProfileSkill";
EXPLAIN (ANALYZE, BUFFERS) SELECT "profileId" FROM "ProfileSkill" WHERE "skillId" = 's-rare';
SQL

journal ""
journal "La base de mesure est conservée sous le nom $BASE_MESURE ; elle est"
journal "recréée à chaque exécution et n'est jamais celle de développement."
journal "Fin de la transcription — $(date --iso-8601=seconds)"

echo "Transcription écrite dans $SORTIE"
