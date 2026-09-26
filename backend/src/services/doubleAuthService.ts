import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { Utilisateur } from "../domain/entities/Utilisateur";
import { UtilisateurRepositoryInterface } from "../domain/interface/utilisateurRepositoryInterface";
import { TotpInterface } from "../domain/interface/totpInterface";
import { Conflit, NonAuthentifie, RequeteInvalide, RessourceIntrouvable } from "../domain/erreurMetier";
import { genererJetonSession, lireJetonTemporaire } from "./jetons";

const NB_CODES_SECOURS = 10;

// Coût plus bas que pour les mots de passe (12) : les codes de secours sont
// aléatoires (40 bits), pas devinables par dictionnaire, et il faut en
// comparer plusieurs à chaque vérification.
const COUT_BCRYPT_CODES = 10;

const REGEX_CODE_TOTP = /^\d{6}$/;

// Double authentification par application (TOTP), optionnelle, activable et
// désactivable à tout moment (voir CLAUDE.md, section Compte et sécurité).
export class DoubleAuthService {
  constructor(
    private readonly utilisateurRepository: UtilisateurRepositoryInterface,
    private readonly totp: TotpInterface
  ) {}

  // Première étape de l'activation : génère un secret et l'adresse à encoder en
  // QR code. La 2FA reste inactive tant que le code n'a pas été confirmé
  // (activer). Refusée si elle est déjà active : régénérer le secret
  // écraserait celui de l'application déjà configurée.
  async initialiser(idUtilisateur: number): Promise<{ secret: string; uri: string }> {
    const utilisateur = await this.trouver(idUtilisateur);

    if (utilisateur.doubleAuthActive) {
      throw new Conflit("La double authentification est déjà activée");
    }

    const secret = this.totp.genererSecret();
    await this.utilisateurRepository.enregistrerSecretTotp(idUtilisateur, secret);

    return { secret, uri: this.totp.construireUri(utilisateur.email, secret) };
  }

  // Seconde étape : le premier code prouve que l'application est bien
  // configurée. Renvoie les codes de secours EN CLAIR, une seule fois — seuls
  // leurs hachages sont conservés, ils ne pourront plus jamais être réaffichés.
  async activer(idUtilisateur: number, code: string): Promise<string[]> {
    const utilisateur = await this.trouver(idUtilisateur);

    if (utilisateur.doubleAuthActive) {
      throw new Conflit("La double authentification est déjà activée");
    }

    const secret = utilisateur.secretDoubleAuth;
    if (!secret) {
      throw new RequeteInvalide("Lancez d'abord la configuration de la double authentification");
    }

    if (!this.totp.verifier(this.normaliser(code), secret)) {
      throw new RequeteInvalide("Code invalide ou expiré", "code");
    }

    const codes = Array.from({ length: NB_CODES_SECOURS }, () => randomBytes(5).toString("hex").toUpperCase());
    const hachages = await Promise.all(codes.map((c) => bcrypt.hash(c, COUT_BCRYPT_CODES)));
    await this.utilisateurRepository.activerDoubleAuth(idUtilisateur, hachages);

    // Affichés avec un tiret au milieu (lisibilité) : normaliser() l'ignore à la saisie.
    return codes.map((c) => `${c.slice(0, 5)}-${c.slice(5)}`);
  }

  // Confirmation d'une action sensible par un autre service (ex. suppression de
  // compte) : sans effet si la 2FA n'est pas active, sinon exige un code valide.
  async exigerCodeSiActive(utilisateur: Utilisateur, code: string | undefined): Promise<void> {
    if (!utilisateur.doubleAuthActive) return;

    if (!code || !(await this.verifierCode(utilisateur, code))) {
      throw new RequeteInvalide("Code de double authentification invalide ou manquant", "code");
    }
  }

  // Exige un code valide (TOTP ou de secours) : sur une session laissée
  // ouverte, désactiver la 2FA sans preuve serait un moyen de la contourner.
  async desactiver(idUtilisateur: number, code: string): Promise<void> {
    const utilisateur = await this.trouver(idUtilisateur);

    if (!utilisateur.doubleAuthActive) {
      throw new RequeteInvalide("La double authentification n'est pas activée");
    }

    if (!(await this.verifierCode(utilisateur, code))) {
      throw new RequeteInvalide("Code invalide ou expiré", "code");
    }

    await this.utilisateurRepository.desactiverDoubleAuth(idUtilisateur);
  }

  // Seconde étape de la connexion : le jeton temporaire prouve que le mot de
  // passe a été validé (jamais un identifiant fourni par le client), le code
  // prouve la possession de l'application. C'est ici que la session s'ouvre.
  async terminerConnexion(
    jetonTemporaire: string,
    code: string
  ): Promise<{ jeton: string; utilisateur: Utilisateur }> {
    const idUtilisateur = lireJetonTemporaire(jetonTemporaire);
    const utilisateur = await this.utilisateurRepository.trouverParId(idUtilisateur);

    if (!utilisateur || !utilisateur.doubleAuthActive) {
      throw new NonAuthentifie("Connexion expirée, recommencez");
    }

    if (!(await this.verifierCode(utilisateur, code))) {
      throw new NonAuthentifie("Code invalide ou expiré");
    }

    await this.utilisateurRepository.majDerniereConnexion(utilisateur.id);

    return { jeton: genererJetonSession(utilisateur), utilisateur };
  }

  // Un code à 6 chiffres est un TOTP ; sinon, un code de secours, consommé
  // (retiré de la liste) dès qu'il est accepté.
  private async verifierCode(utilisateur: Utilisateur, code: string): Promise<boolean> {
    const saisie = this.normaliser(code);

    if (REGEX_CODE_TOTP.test(saisie)) {
      const secret = utilisateur.secretDoubleAuth;
      return secret !== null && this.totp.verifier(saisie, secret);
    }

    const hachages = utilisateur.codesSecours;
    for (let i = 0; i < hachages.length; i++) {
      if (await bcrypt.compare(saisie, hachages[i])) {
        const restants = hachages.filter((_, index) => index !== i);
        await this.utilisateurRepository.mettreAJourCodesSecours(utilisateur.id, restants);
        return true;
      }
    }

    return false;
  }

  // Tolère espaces et tirets à la saisie ("ABCDE-12345", "123 456").
  private normaliser(code: string): string {
    return code.replace(/[\s-]/g, "").toUpperCase();
  }

  private async trouver(idUtilisateur: number): Promise<Utilisateur> {
    const utilisateur = await this.utilisateurRepository.trouverParId(idUtilisateur);

    if (!utilisateur) {
      throw new RessourceIntrouvable("Utilisateur introuvable");
    }

    return utilisateur;
  }
}
