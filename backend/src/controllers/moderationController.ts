import { Request, Response, NextFunction } from "express";
import { ModerationService } from "../services/moderationService";
import { signalementSchema } from "../schemas/signalementSchema";
import { RequeteInvalide } from "../domain/erreurMetier";

export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  // POST /evenements/:id/signalements — un joueur signale un événement
  signaler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req, "id");
      const { idMotif, texteLibre } = signalementSchema.parse(req.body);

      const signalement = await this.moderationService.signaler(
        idEvenement,
        req.utilisateur!.id,
        idMotif,
        texteLibre
      );

      res.status(201).json(signalement.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };

  // GET /moderation/signalements — liste des signalements à traiter (admin)
  lister = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signalements = await this.moderationService.listerSignalementsEnAttente();

      res.json(
        signalements.map(({ signalement, motifLibelle, evenementTitre }) => ({
          ...signalement.versReponse(),
          motifLibelle,
          evenementTitre,
        }))
      );
    } catch (erreur) {
      next(erreur);
    }
  };

  // POST /moderation/evenements/:id/sanctionner — désactive l'événement + avertit l'organisateur
  sanctionner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req, "id");
      await this.moderationService.sanctionner(idEvenement);

      res.status(204).send();
    } catch (erreur) {
      next(erreur);
    }
  };

  // DELETE /moderation/evenements/:id/signalements — faux signalement, l'événement reste actif
  rejeter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req, "id");
      await this.moderationService.rejeterSignalements(idEvenement);

      res.status(204).send();
    } catch (erreur) {
      next(erreur);
    }
  };

  private extraireId(req: Request, param: string): number {
    const id = Number(req.params[param]);

    if (!Number.isInteger(id)) {
      throw new RequeteInvalide("Identifiant invalide");
    }

    return id;
  }
}
