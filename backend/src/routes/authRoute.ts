import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { DoubleAuthController } from "../controllers/doubleAuthController";
import { authentifier } from "../middlewares/authentification";
import { limiteurTentatives } from "../middlewares/limiteurTentatives";

export const authRoutes = Router();

// Branche les endpoints sur le controller instancié au démarrage.
export const registerAuthRoutes = (controller: AuthController, doubleAuthController: DoubleAuthController) => {
  authRoutes.post("/inscription", controller.inscription);
  authRoutes.post("/connexion", limiteurTentatives, controller.connexion);
  // Seconde étape quand le compte a la double authentification (le jeton
  // temporaire du corps prouve que le mot de passe a été validé).
  authRoutes.post("/connexion/2fa", limiteurTentatives, doubleAuthController.connexion);
  authRoutes.get("/profil", authentifier, controller.profil);
  authRoutes.post("/deconnexion", controller.deconnexion);
};