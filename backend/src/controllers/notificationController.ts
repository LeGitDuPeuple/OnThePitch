import { Request, Response, NextFunction } from "express";
import { NotificationService } from "../services/notificationService";
import { RequeteInvalide } from "../domain/erreurMetier";

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // GET /notifications — les miennes, les plus récentes d'abord
  lister = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await this.notificationService.lister(req.utilisateur!.id);

      res.json(
        notifications.map(({ notification, evenementTitre }) => ({
          id: notification.id,
          type: notification.type,
          idEvenement: notification.idEvenement,
          evenementTitre,
          lu: notification.lu,
          dateCreation: notification.dateCreation,
        }))
      );
    } catch (erreur) {
      next(erreur);
    }
  };

  // POST /notifications/:id/lue
  marquerLue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        throw new RequeteInvalide("Identifiant de notification invalide");
      }

      await this.notificationService.marquerLue(id, req.utilisateur!.id);

      res.status(204).send();
    } catch (erreur) {
      next(erreur);
    }
  };
}
