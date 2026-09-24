// Port de la double authentification par application (TOTP : Microsoft
// Authenticator, Google Authenticator...). Même rôle que GeocodeurInterface :
// le service ne connaît pas la librairie, les tests injectent un double.
export interface TotpInterface {
  // Génère un nouveau secret partagé (base32).
  genererSecret(): string;

  // Adresse otpauth:// à encoder en QR code pour l'application d'authentification.
  construireUri(email: string, secret: string): string;

  // Vrai si le code à 6 chiffres est valide pour ce secret à cet instant
  // (avec une tolérance d'horloge d'une tranche de 30 secondes).
  verifier(code: string, secret: string): boolean;
}
