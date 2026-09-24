import { Request, Response, NextFunction } from "express";
import { CompteService } from "../services/compteService";
import { changementEmailSchema, changementMotDePasseSchema } from "../schemas/compteSchema";

export class CompteController {
  constructor(private readonly compteService: CompteService) {}

  // PATCH /compte/email — renvoie l'utilisateur à jour (le front met son état à jour)
  changerEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, motDePasse } = changementEmailSchema.parse(req.body);
      const utilisateur = await this.compteService.changerEmail(req.utilisateur!.id, email, motDePasse);

      res.json(utilisateur.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };

  // PATCH /compte/mot-de-passe
  changerMotDePasse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { motDePasseActuel, nouveauMotDePasse } = changementMotDePasseSchema.parse(req.body);
      await this.compteService.changerMotDePasse(req.utilisateur!.id, motDePasseActuel, nouveauMotDePasse);

      res.status(204).send();
    } catch (erreur) {
      next(erreur);
    }
  };
}
