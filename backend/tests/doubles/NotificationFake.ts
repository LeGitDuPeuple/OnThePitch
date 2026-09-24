import { TypeNotification } from "../../src/domain/entities/Notification";
import { NotificationInterface } from "../../src/domain/interface/notificationInterface";

// Double du port NotificationInterface — injecté dans EvenementService et
// InscriptionService pour vérifier qu'ils déclenchent la bonne notification,
// sans dépendre de la vraie persistance ni d'un envoi d'email.
export class NotificationFake implements NotificationInterface {
  appels: { idJoueur: number; type: TypeNotification; idEvenement: number }[] = [];

  async notifier(idJoueur: number, type: TypeNotification, idEvenement: number): Promise<void> {
    this.appels.push({ idJoueur, type, idEvenement });
  }
}
