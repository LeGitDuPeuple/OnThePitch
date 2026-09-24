import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { inscriptionSchema, connexionSchema } from "../schemas/authSchema";
import { poserCookieJeton, effacerCookieJeton } from "../config/cookie";

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

  // POST /auth/connexion — le jeton part dans un cookie httpOnly, jamais dans le corps
  // de la réponse : le JavaScript du front n'a pas à le connaître pour fonctionner.
  connexion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const donnees = connexionSchema.parse(req.body);
      const resultat = await this.authService.connecter(donnees);

      // Double authentification active : pas de cookie à ce stade, le front
      // enchaîne avec POST /auth/connexion/2fa (voir DoubleAuthService).
      if (resultat.doubleAuthRequise) {
        res.json({ doubleAuthRequise: true, jetonTemporaire: resultat.jetonTemporaire });
        return;
      }

      poserCookieJeton(res, resultat.jeton);
      res.json({ doubleAuthRequise: false, utilisateur: resultat.utilisateur.versReponse() });
    } catch (erreur) {
      next(erreur);
    }
  };

  // GET /auth/profil — route protégée, nécessite un jeton valide (cookie)
  profil = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const utilisateur = await this.authService.trouverProfil(req.utilisateur!.id);
      res.json(utilisateur.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };

  // POST /auth/deconnexion — le cookie étant httpOnly, seul le serveur peut l'effacer
  deconnexion = (_req: Request, res: Response) => {
    effacerCookieJeton(res);
    res.status(204).send();
  };
}