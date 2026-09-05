import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { inscriptionSchema, connexionSchema } from "../schemas/authSchema";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/inscription
  inscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const donnees = inscriptionSchema.parse(req.body);
      const utilisateur = await this.authService.inscrire(donnees);

      res.status(201).json(utilisateur.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };

  // POST /auth/connexion
  connexion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const donnees = connexionSchema.parse(req.body);
      const { jeton, utilisateur } = await this.authService.connecter(donnees);

      res.json({ jeton, utilisateur: utilisateur.versReponse() });
    } catch (erreur) {
      next(erreur);
    }
  };

    // GET /auth/profil — route protégée, nécessite un jeton valide
  profil = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const utilisateur = await this.authService.trouverProfil(req.utilisateur!.id);
      res.json(utilisateur.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };
}