import { prisma } from "../config/prismaClient";
import { Notification, TypeNotification } from "../domain/entities/Notification";
import {
  NotificationRepositoryInterface,
  NouvelleNotification,
  NotificationDetail,
} from "../domain/interface/notificationRepositoryInterface";

export class NotificationRepositoryDatabase implements NotificationRepositoryInterface {
  async creer(donnees: NouvelleNotification): Promise<Notification> {
    const ligne = await prisma.notification.create({
      data: { idJoueur: donnees.idJoueur, idEvenement: donnees.idEvenement, type: donnees.type },
    });

    return this.versEntite(ligne);
  }

  async listerParJoueur(idJoueur: number): Promise<NotificationDetail[]> {
    const lignes = await prisma.notification.findMany({
      where: { idJoueur },
      include: { evenement: true },
      orderBy: { dateCreation: "desc" },
    });

    return lignes.map((ligne) => ({
      notification: this.versEntite(ligne),
      evenementTitre: ligne.evenement.titre,
    }));
  }

  async compterNonLues(idJoueur: number): Promise<number> {
    return prisma.notification.count({ where: { idJoueur, lu: false } });
  }

  async marquerLue(idNotification: number, idJoueur: number): Promise<void> {
    // updateMany plutôt que update : ne lève pas si l'id n'appartient pas à
    // idJoueur (ou n'existe pas), silencieux dans les deux cas (voir interface).
    await prisma.notification.updateMany({
      where: { idNotification, idJoueur },
      data: { lu: true },
    });
  }

  private versEntite(ligne: {
    idNotification: number;
    idJoueur: number;
    idEvenement: number;
    type: string;
    lu: boolean;
    dateCreation: Date;
  }): Notification {
    return new Notification({
      id: ligne.idNotification,
      idJoueur: ligne.idJoueur,
      idEvenement: ligne.idEvenement,
      type: ligne.type as TypeNotification,
      lu: ligne.lu,
      dateCreation: ligne.dateCreation,
    });
  }
}
