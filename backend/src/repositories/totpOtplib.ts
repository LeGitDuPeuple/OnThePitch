import { generateSecret, generateURI, verifySync } from "otplib";
import { TotpInterface } from "../domain/interface/totpInterface";

// Nom affiché dans l'application d'authentification.
const EMETTEUR = process.env["APP_NAME"] ?? "OnThePitch";

// Tolérance d'une tranche de 30 s de part et d'autre : absorbe un léger
// décalage entre l'horloge du téléphone et celle du serveur. Au-delà, les
// codes sont refusés — l'horloge du serveur doit rester synchronisée (NTP).
const TOLERANCE_HORLOGE_S = 30;

export class TotpOtplib implements TotpInterface {
  genererSecret(): string {
    return generateSecret();
  }

  construireUri(email: string, secret: string): string {
    return generateURI({ issuer: EMETTEUR, label: email, secret });
  }

  verifier(code: string, secret: string): boolean {
    return verifySync({ secret, token: code, epochTolerance: TOLERANCE_HORLOGE_S }).valid;
  }
}
