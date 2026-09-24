-- CreateTable
CREATE TABLE "notification" (
    "id_notification" SERIAL NOT NULL,
    "id_joueur" INTEGER NOT NULL,
    "id_evenement" INTEGER NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id_notification")
);

-- CreateIndex
CREATE INDEX "notification_id_joueur_lu_idx" ON "notification"("id_joueur", "lu");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_id_joueur_fkey" FOREIGN KEY ("id_joueur") REFERENCES "utilisateur"("id_joueur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_id_evenement_fkey" FOREIGN KEY ("id_evenement") REFERENCES "evenement"("id_evenement") ON DELETE RESTRICT ON UPDATE CASCADE;
