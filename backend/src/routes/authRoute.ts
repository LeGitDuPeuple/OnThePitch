import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authentifier } from "../middlewares/authentification";
import { limiteurTentatives } from "../middlewares/limiteurTentatives";

export const authRoutes = Router();

// Branche les endpoints sur le controller instancié au démarrage.
export const registerAuthRoutes = (controller: AuthController) => {
  authRoutes.post("/inscription", controller.inscription);
  authRoutes.post("/connexion", limiteurTentatives, controller.connexion);
  authRoutes.get("/profil", authentifier, controller.profil);
  authRoutes.post("/deconnexion", controller.deconnexion);
};