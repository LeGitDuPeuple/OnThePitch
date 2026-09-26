-- Suppression de compte (RGPD) : suppression logique + anonymisation.
-- La ligne est conservée (les événements passés et les évaluations y restent
-- rattachés) mais ses données personnelles sont effacées ; cette date marque
-- le compte comme supprimé.
ALTER TABLE "utilisateur" ADD COLUMN "date_suppression" TIMESTAMP(3);
