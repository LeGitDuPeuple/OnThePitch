import rateLimit from "express-rate-limit";
import { TropDeRequetes } from "../domain/erreurMetier";

const FENETRE_MS = 15 * 60 * 1000;
// Plafond par défaut ; LIMITE_TENTATIVES permet de le relever (ex. pour rejouer
// la suite E2E en boucle : elle provoque volontairement quelques échecs de
// connexion par exécution, tous comptés sur la même IP locale).
// `||` et non `??` : la variable peut exister mais vide (copie de .env.example),
// ce qui donnerait une limite de 0 — tout serait bloqué.
const TENTATIVES_MAX = Number(process.env["LIMITE_TENTATIVES"]) || 10;

// Freine les essais répétés sur les routes qui vérifient un secret (mot de
// passe, plus tard code de double authentification) : sans ça, rien
// n'empêchait de tester des milliers de mots de passe sur /auth/connexion.
// Seuls les ÉCHECS comptent (skipSuccessfulRequests) : un utilisateur qui se
// connecte normalement n'est jamais freiné. Compteur en mémoire, par IP et
// par processus — suffisant à cette échelle (voir CLAUDE.md, section
// Sécurité, pour la limite en cas de plusieurs instances).
export const limiteurTentatives = rateLimit({
  windowMs: FENETRE_MS,
  limit: TENTATIVES_MAX,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  // Passe par le gestionnaire d'erreurs centralisé : même format JSON et
  // même message en français que le reste de l'API.
  handler: (_req, _res, next) => {
    next(new TropDeRequetes("Trop de tentatives, réessayez dans quelques minutes"));
  },
});
