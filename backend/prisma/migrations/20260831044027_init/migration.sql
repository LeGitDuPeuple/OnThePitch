-- CreateTable
CREATE TABLE "statut_utilisateur" (
    "id_statut" SERIAL NOT NULL,
    "libelle_statut" VARCHAR(50) NOT NULL,

    CONSTRAINT "statut_utilisateur_pkey" PRIMARY KEY ("id_statut")
);

-- CreateTable
CREATE TABLE "niveau_utilisateur" (
    "id_niveau" SERIAL NOT NULL,
    "libelle_niveau" VARCHAR(50) NOT NULL,

    CONSTRAINT "niveau_utilisateur_pkey" PRIMARY KEY ("id_niveau")
);

-- CreateTable
CREATE TABLE "statut_event" (
    "id_statut_event" SERIAL NOT NULL,
    "libelle_event" VARCHAR(50) NOT NULL,

    CONSTRAINT "statut_event_pkey" PRIMARY KEY ("id_statut_event")
);

-- CreateTable
CREATE TABLE "niveau_event" (
    "id_niveau_event" SERIAL NOT NULL,
    "libelle_niveau_event" VARCHAR(50) NOT NULL,

    CONSTRAINT "niveau_event_pkey" PRIMARY KEY ("id_niveau_event")
);

-- CreateTable
CREATE TABLE "motif" (
    "id_motif" SERIAL NOT NULL,
    "libelle" VARCHAR(50) NOT NULL,

    CONSTRAINT "motif_pkey" PRIMARY KEY ("id_motif")
);

-- CreateTable
CREATE TABLE "utilisateur" (
    "id_joueur" SERIAL NOT NULL,
    "nom" VARCHAR(50) NOT NULL,
    "prenom" VARCHAR(50) NOT NULL,
    "email" VARCHAR(50) NOT NULL,
    "mot_de_passe" VARCHAR(255) NOT NULL,
    "ville" VARCHAR(50),
    "date_inscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),
    "role" VARCHAR(20) NOT NULL DEFAULT 'joueur',
    "id_statut" INTEGER,
    "id_niveau" INTEGER,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id_joueur")
);

-- CreateTable
CREATE TABLE "lieu" (
    "id_lieu" SERIAL NOT NULL,
    "region" VARCHAR(50),
    "ville" VARCHAR(50) NOT NULL,
    "adresse" VARCHAR(50) NOT NULL,
    "code_postal" VARCHAR(50) NOT NULL,
    "type_terrain" VARCHAR(50),
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,

    CONSTRAINT "lieu_pkey" PRIMARY KEY ("id_lieu")
);

-- CreateTable
CREATE TABLE "evenement" (
    "id_evenement" SERIAL NOT NULL,
    "titre" VARCHAR(50) NOT NULL,
    "nombre_places" INTEGER NOT NULL,
    "type_prive_publique" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "date_desactivation" TIMESTAMP(3),
    "id_lieu" INTEGER NOT NULL,
    "id_statut_event" INTEGER NOT NULL,
    "id_joueur" INTEGER NOT NULL,

    CONSTRAINT "evenement_pkey" PRIMARY KEY ("id_evenement")
);

-- CreateTable
CREATE TABLE "requiert" (
    "id_evenement" INTEGER NOT NULL,
    "id_niveau_event" INTEGER NOT NULL,

    CONSTRAINT "requiert_pkey" PRIMARY KEY ("id_evenement","id_niveau_event")
);

-- CreateTable
CREATE TABLE "rejoint" (
    "id_joueur" INTEGER NOT NULL,
    "id_evenement" INTEGER NOT NULL,
    "date_inscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "presence" TIMESTAMP(3),
    "statut_inscription" VARCHAR(50) NOT NULL DEFAULT 'en_attente',

    CONSTRAINT "rejoint_pkey" PRIMARY KEY ("id_joueur","id_evenement")
);

-- CreateTable
CREATE TABLE "signal" (
    "id_joueur" INTEGER NOT NULL,
    "id_evenement" INTEGER NOT NULL,
    "id_motif" INTEGER NOT NULL,
    "date_signalement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "texte_libre" VARCHAR(255),

    CONSTRAINT "signal_pkey" PRIMARY KEY ("id_joueur","id_evenement","id_motif")
);

-- CreateTable
CREATE TABLE "evaluation" (
    "id_joueur" INTEGER NOT NULL,
    "id_evenement" INTEGER NOT NULL,
    "note" INTEGER NOT NULL,
    "date_evaluation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentaire" VARCHAR(255),

    CONSTRAINT "evaluation_pkey" PRIMARY KEY ("id_joueur","id_evenement")
);

-- CreateIndex
CREATE UNIQUE INDEX "statut_utilisateur_libelle_statut_key" ON "statut_utilisateur"("libelle_statut");

-- CreateIndex
CREATE UNIQUE INDEX "niveau_utilisateur_libelle_niveau_key" ON "niveau_utilisateur"("libelle_niveau");

-- CreateIndex
CREATE UNIQUE INDEX "statut_event_libelle_event_key" ON "statut_event"("libelle_event");

-- CreateIndex
CREATE UNIQUE INDEX "niveau_event_libelle_niveau_event_key" ON "niveau_event"("libelle_niveau_event");

-- CreateIndex
CREATE UNIQUE INDEX "motif_libelle_key" ON "motif"("libelle");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE INDEX "utilisateur_email_idx" ON "utilisateur"("email");

-- CreateIndex
CREATE INDEX "evenement_date_debut_idx" ON "evenement"("date_debut");

-- CreateIndex
CREATE INDEX "evenement_id_joueur_idx" ON "evenement"("id_joueur");

-- CreateIndex
CREATE INDEX "rejoint_id_evenement_idx" ON "rejoint"("id_evenement");

-- AddForeignKey
ALTER TABLE "utilisateur" ADD CONSTRAINT "utilisateur_id_statut_fkey" FOREIGN KEY ("id_statut") REFERENCES "statut_utilisateur"("id_statut") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateur" ADD CONSTRAINT "utilisateur_id_niveau_fkey" FOREIGN KEY ("id_niveau") REFERENCES "niveau_utilisateur"("id_niveau") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement" ADD CONSTRAINT "evenement_id_lieu_fkey" FOREIGN KEY ("id_lieu") REFERENCES "lieu"("id_lieu") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement" ADD CONSTRAINT "evenement_id_statut_event_fkey" FOREIGN KEY ("id_statut_event") REFERENCES "statut_event"("id_statut_event") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evenement" ADD CONSTRAINT "evenement_id_joueur_fkey" FOREIGN KEY ("id_joueur") REFERENCES "utilisateur"("id_joueur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requiert" ADD CONSTRAINT "requiert_id_evenement_fkey" FOREIGN KEY ("id_evenement") REFERENCES "evenement"("id_evenement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requiert" ADD CONSTRAINT "requiert_id_niveau_event_fkey" FOREIGN KEY ("id_niveau_event") REFERENCES "niveau_event"("id_niveau_event") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rejoint" ADD CONSTRAINT "rejoint_id_joueur_fkey" FOREIGN KEY ("id_joueur") REFERENCES "utilisateur"("id_joueur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rejoint" ADD CONSTRAINT "rejoint_id_evenement_fkey" FOREIGN KEY ("id_evenement") REFERENCES "evenement"("id_evenement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal" ADD CONSTRAINT "signal_id_joueur_fkey" FOREIGN KEY ("id_joueur") REFERENCES "utilisateur"("id_joueur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal" ADD CONSTRAINT "signal_id_evenement_fkey" FOREIGN KEY ("id_evenement") REFERENCES "evenement"("id_evenement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal" ADD CONSTRAINT "signal_id_motif_fkey" FOREIGN KEY ("id_motif") REFERENCES "motif"("id_motif") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_id_joueur_fkey" FOREIGN KEY ("id_joueur") REFERENCES "utilisateur"("id_joueur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_id_evenement_fkey" FOREIGN KEY ("id_evenement") REFERENCES "evenement"("id_evenement") ON DELETE RESTRICT ON UPDATE CASCADE;
