import { Router } from "express";
import { AuthController } from "../controllers/authController";

export const authRoutes = Router();

// Branche les endpoints sur le controller instancié au démarrage.
export const registerAuthRoutes = (controller: AuthController) => {
  authRoutes.post("/inscription", controller.inscription);
  authRoutes.post("/connexion", controller.connexion);
};