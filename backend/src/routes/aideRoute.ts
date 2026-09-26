import { Router } from "express";
import { ContactController } from "../controllers/contactController";
import { limiteurContact } from "../middlewares/limiteurContact";

export const aideRoutes = Router();

export const registerAideRoutes = (controller: ContactController) => {
  aideRoutes.post("/contact", limiteurContact, controller.envoyer);
};
