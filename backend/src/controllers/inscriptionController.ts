import { Request, Response, NextFunction } from "express";
import { InscriptionService } from "../services/inscriptionService";
import { validationDemandeSchema } from "../schemas/inscriptionSchema";
import { RequeteInvalide } from "../domain/erreurMetier";

export class InscriptionController {
  constructor(private readonly inscriptionService: InscriptionService) {}

  // POST /evenements/:id/inscriptions — rejoindre (public : direct, privé : demande)
  rejoindre = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req, "id");
      const inscription = await this.inscriptionService.rejoindre(idEvenement, req.utilisateur!.id);

      res.status(201).json(inscription.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };

  // PATCH /evenements/:id/inscriptions/:idJoueur — validation par l'organisateur (événement privé)
  validerDemande = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req, "id");
      const idJoueur = this.extraireId(req, "idJoueur");
      const { accepter } = validationDemandeSchema.parse(req.body);

      const inscription = await this.inscriptionService.validerDemande(
        idEvenement,
        idJoueur,
        req.utilisateur!.id,
        accepter
      );

      res.json(inscription.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };

  // DELETE /evenements/:id/inscriptions — le joueur se désinscrit lui-même
  seDesinscrire = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req, "id");
      await this.inscriptionService.desinscrire(idEvenement, req.utilisateur!.id);

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
