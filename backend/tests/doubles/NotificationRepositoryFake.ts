import { Notification } from "../../src/domain/entities/Notification";
import {
  NotificationRepositoryInterface,
  NouvelleNotification,
  NotificationDetail,
} from "../../src/domain/interface/notificationRepositoryInterface";

export class NotificationRepositoryFake implements NotificationRepositoryInterface {
  private notifications: Notification[] = [];
  private prochainId = 1;

  async creer(donnees: NouvelleNotification): Promise<Notification> {
    const notification = new Notification({
      id: this.prochainId++,
      idJoueur: donnees.idJoueur,
      idEvenement: donnees.idEvenement,
      type: donnees.type,
      dateCreation: new Date(),
    });
    this.notifications.push(notification);
    return notification;
  }

  async listerParJoueur(idJoueur: number): Promise<NotificationDetail[]> {
    return this.notifications
      .filter((n) => n.idJoueur === idJoueur)
      .map((notification) => ({ notification, evenementTitre: `Événement #${notification.idEvenement}` }));
  }

  async compterNonLues(idJoueur: number): Promise<number> {
    return this.notifications.filter((n) => n.idJoueur === idJoueur && !n.lu).length;
  }

  async marquerLue(idNotification: number, idJoueur: number): Promise<void> {
    const notification = this.notifications.find((n) => n.id === idNotification && n.idJoueur === idJoueur);
    if (notification) notification.lu = true;
  }
}
