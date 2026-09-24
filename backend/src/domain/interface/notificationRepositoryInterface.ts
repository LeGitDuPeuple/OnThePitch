import { Notification, TypeNotification } from "../entities/Notification";

export type NouvelleNotification = {
  idJoueur: number;
  idEvenement: number;
  type: TypeNotification;
};

// Notification enrichie du titre de l'événement concerné, pour l'affichage
// (évite un aller-retour supplémentaire côté front pour composer le message).
export type NotificationDetail = {
  notification: Notification;
  evenementTitre: string;
};

export interface NotificationRepositoryInterface {
  creer(donnees: NouvelleNotification): Promise<Notification>;

  // Les plus récentes d'abord — pour l'affichage dans la cloche de l'en-tête.
  listerParJoueur(idJoueur: number): Promise<NotificationDetail[]>;

  compterNonLues(idJoueur: number): Promise<number>;

  // Silencieux si l'id n'appartient pas à idJoueur (aucune notification ne
  // correspond) — pas d'erreur à distinguer d'un id inexistant, l'un et
  // l'autre reviennent au même pour l'appelant.
  marquerLue(idNotification: number, idJoueur: number): Promise<void>;
}
