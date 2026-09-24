import { TypeNotification } from "../entities/Notification";

// Port utilisé par les autres services (InscriptionService, EvenementService)
// pour déclencher une notification, exactement comme GeocodeurInterface est
// utilisé par EvenementService pour le géocodage — l'appelant ne connaît ni
// la persistance ni l'envoi d'email derrière, juste ce port.
export interface NotificationInterface {
  notifier(idJoueur: number, type: TypeNotification, idEvenement: number): Promise<void>;
}
