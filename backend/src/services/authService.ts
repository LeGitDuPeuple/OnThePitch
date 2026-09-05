import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Utilisateur } from "../domain/entities/Utilisateur";
import { UtilisateurRepositoryInterface } from "../domain/interface/utilisateurRepositoryInterface";
import { Conflit, NonAuthentifie, RessourceIntrouvable } from "../domain/erreurMetier";
import { DonneesInscription, DonneesConnexion } from "../schemas/authSchema";
import { getEnvVariable } from "../config/utility/utils";

const COUT_BCRYPT = 12;
const DUREE_JETON = "24h";

export class AuthService {
  constructor(private readonly utilisateurRepository: UtilisateurRepositoryInterface) {}

  // Crée un compte : vérifie que l'email est libre, hache le mot de passe, enregistre.
  async inscrire(donnees: DonneesInscription): Promise<Utilisateur> {
    const existant = await this.utilisateurRepository.trouverParEmail(donnees.email);

    if (existant) {
      throw new Conflit("Un compte existe déjà avec cet email");
    }

    const motDePasseHache = await bcrypt.hash(donnees.motDePasse, COUT_BCRYPT);

    const utilisateur = await this.utilisateurRepository.creer({
      nom: donnees.nom,
      prenom: donnees.prenom,
      email: donnees.email,
      motDePasseHache,
      ville: donnees.ville,
    });

    return utilisateur;
  }

  // Vérifie les identifiants et renvoie un jeton signé.
  async connecter(donnees: DonneesConnexion): Promise<{ jeton: string; utilisateur: Utilisateur }> {
    const utilisateur = await this.utilisateurRepository.trouverParEmail(donnees.email);

    // Même message dans les deux cas : ne pas révéler si l'email existe.
    if (!utilisateur) {
      throw new NonAuthentifie("Email ou mot de passe incorrect");
    }

    const motDePasseValide = await bcrypt.compare(donnees.motDePasse, utilisateur.hachage);

    if (!motDePasseValide) {
      throw new NonAuthentifie("Email ou mot de passe incorrect");
    }

    await this.utilisateurRepository.majDerniereConnexion(utilisateur.id);

    const jeton = this.genererJeton(utilisateur);

    return { jeton, utilisateur };
  }

    // Récupère le profil d'un utilisateur connecté.
  async trouverProfil(id: number): Promise<Utilisateur> {
    const utilisateur = await this.utilisateurRepository.trouverParId(id);

    if (!utilisateur) {
      throw new RessourceIntrouvable("Utilisateur introuvable");
    }

    return utilisateur;
  }

  // Fabrique un JWT contenant l'identifiant et le rôle.
  private genererJeton(utilisateur: Utilisateur): string {
    return jwt.sign(
      { id: utilisateur.id, role: utilisateur.role },
      getEnvVariable("JWT_SECRET"),
      { expiresIn: DUREE_JETON }
    );
  }
}