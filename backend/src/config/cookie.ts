import { Response } from "express";

export const NOM_COOKIE_JETON = "onthepitch_jeton";

// Alignée sur la durée du JWT (voir AuthService.DUREE_JETON).
const DUREE_COOKIE_MS = 24 * 60 * 60 * 1000;

// Pose le jeton dans un cookie httpOnly : inaccessible au JavaScript de la page,
// donc invulnérable au vol par script injecté (XSS) — contrairement au localStorage.
export const poserCookieJeton = (res: Response, jeton: string): void => {
  res.cookie(NOM_COOKIE_JETON, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: DUREE_COOKIE_MS,
  });
};

export const effacerCookieJeton = (res: Response): void => {
  res.clearCookie(NOM_COOKIE_JETON);
};
