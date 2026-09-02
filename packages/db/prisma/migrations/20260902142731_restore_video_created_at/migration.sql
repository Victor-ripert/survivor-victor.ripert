-- Réintroduit une colonne que 20260902133533_add_video_consent a supprimée.
-- Cette migration-là annonce elle-même la perte dans son en-tête généré
-- (« All the data in the column will be lost »), ce qui se lit comme un effet
-- de bord et non comme une intention : toutes les autres tables portent un
-- createdAt, le catalogue s'en sert pour choisir la vidéo d'aperçu d'un profil,
-- et un consentement sans date de dépôt fait une piste d'audit médiocre.

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Reprise de l'horodatage plutôt qu'un CURRENT_TIMESTAMP uniforme : sur une
-- base réparée par scripts/reparer-migration-consentement.sh, "acceptedAt" a
-- justement été rempli depuis l'ancien "createdAt", donc la valeur d'origine
-- revient ici intacte. Sur une base neuve, les deux dates coïncident de toute
-- façon.
UPDATE "Video" SET "createdAt" = "acceptedAt";
