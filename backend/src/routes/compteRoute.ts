import { Router } from "express";
import { CompteController } from "../controllers/compteController";
import { authentifier } from "../middlewares/authentification";
import { limiteurTentatives } from "../middlewares/limiteurTentatives";

export const compteRoutes = Router();

// Toutes les routes exigent une session, et le limiteur freine les
// confirmations par mot de passe répétées (mot de passe deviné sur une
// session ouverte).
export const registerCompteRoutes = (controller: CompteController) => {
  compteRoutes.patch("/email", authentifier, limiteurTentatives, controller.changerEmail);
  compteRoutes.patch("/mot-de-passe", authentifier, limiteurTentatives, controller.changerMotDePasse);
};
