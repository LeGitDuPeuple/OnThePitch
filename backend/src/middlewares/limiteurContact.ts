import rateLimit from "express-rate-limit";
import { TropDeRequetes } from "../domain/erreurMetier";

const FENETRE_MS = 60 * 60 * 1000;
// `||` et non `??` : voir limiteurTentatives (variable possiblement vide).
const ENVOIS_MAX = Number(process.env["LIMITE_CONTACTS"]) || 5;

// Route publique qui déclenche un email : sans plafond, elle servirait à
// inonder la boîte de support. Contrairement à limiteurTentatives, TOUTES les
// requêtes comptent (c'est l'envoi lui-même qu'on borne, pas les échecs).
export const limiteurContact = rateLimit({
  windowMs: FENETRE_MS,
  limit: ENVOIS_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TropDeRequetes("Trop de messages envoyés, réessayez plus tard"));
  },
});
