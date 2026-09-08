import { Request, Response, NextFunction } from "express";
import { PresenceService } from "../services/presenceService";
import { scanPresenceSchema, marquagePresenceManuelSchema } from "../schemas/presenceSchema";
import { RequeteInvalide } from "../domain/erreurMetier";

export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  // GET /evenements/:id/presences/jeton — le joueur récupère son QR de présence
  genererJeton = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req);
      const jeton = await this.presenceService.genererJetonPresence(idEvenement, req.utilisateur!.id);

      res.json({ jeton });
    } catch (erreur) {
      next(erreur);
    }
  };

  // POST /evenements/:id/presences/scan — l'organisateur scanne le QR d'un joueur
  scanner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req);
      const { jeton } = scanPresenceSchema.parse(req.body);

      const inscription = await this.presenceService.validerParQr(idEvenement, jeton, req.utilisateur!.id);

      res.json(inscription.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };

  // POST /evenements/:id/presences/manuel — marquage manuel, en secours
  marquerManuellement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req);
      const { idJoueur } = marquagePresenceManuelSchema.parse(req.body);

      const inscription = await this.presenceService.marquerManuellement(idEvenement, idJoueur, req.utilisateur!.id);

      res.json(inscription.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };

  private extraireId(req: Request): number {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      throw new RequeteInvalide("Identifiant d'événement invalide");
    }

    return id;
  }
}
