import { Router } from "express";
import { CompteController } from "../controllers/compteController";
import { DoubleAuthController } from "../controllers/doubleAuthController";
import { authentifier } from "../middlewares/authentification";
import { limiteurTentatives } from "../middlewares/limiteurTentatives";

export const compteRoutes = Router();

// Toutes les routes exigent une session, et le limiteur freine les
// confirmations par mot de passe répétées (mot de passe deviné sur une
// session ouverte).
export const registerCompteRoutes = (controller: CompteController, doubleAuthController: DoubleAuthController) => {
  compteRoutes.patch("/email", authentifier, limiteurTentatives, controller.changerEmail);
  compteRoutes.patch("/mot-de-passe", authentifier, limiteurTentatives, controller.changerMotDePasse);

  // Double authentification : activer et désactiver exigent un code valide,
  // donc le limiteur s'y applique aussi (codes devinés sur une session ouverte).
  compteRoutes.post("/2fa/initialiser", authentifier, doubleAuthController.initialiser);
  compteRoutes.post("/2fa/activer", authentifier, limiteurTentatives, doubleAuthController.activer);
  compteRoutes.post("/2fa/desactiver", authentifier, limiteurTentatives, doubleAuthController.desactiver);
};
