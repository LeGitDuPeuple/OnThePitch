import jwt from "jsonwebtoken";
import { Evenement } from "../domain/entities/Evenement";
import { Inscription } from "../domain/entities/Inscription";
import { InscriptionRepositoryInterface } from "../domain/interface/inscriptionRepositoryInterface";
import { EvenementRepositoryInterface } from "../domain/interface/evenementRepositoryInterface";
import { getEnvVariable } from "../config/utility/utils";
import { RessourceIntrouvable, AccesRefuse, RequeteInvalide, Conflit } from "../domain/erreurMetier";

// Contenu du QR de présence. Le champ "type" le distingue du jeton d'authentification
// (même secret, formes différentes) : un jeton de connexion ne peut pas être rejoué ici.
type JetonPresencePayload = {
  idJoueur: number;
  idEvenement: number;
  type: "presence";
};

// Marge après la fin de l'événement, pour laisser le temps de scanner les retardataires.
const TAMPON_APRES_EVENEMENT_MS = 2 * 60 * 60 * 1000;

export class PresenceService {
  constructor(
    private readonly inscriptionRepository: InscriptionRepositoryInterface,
    private readonly evenementRepository: EvenementRepositoryInterface
  ) {}

  // Génère le QR de présence d'un joueur, valable le jour de l'événement seulement.
  async genererJetonPresence(idEvenement: number, idJoueur: number): Promise<string> {
    const evenement = await this.evenementRepository.trouverParId(idEvenement);

    if (!evenement || !evenement.estActif()) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    if (!this.estAujourdhui(evenement.dateDebut)) {
      throw new RequeteInvalide("Le QR de présence n'est disponible que le jour de l'événement");
    }

    const inscription = await this.inscriptionRepository.trouver(idJoueur, idEvenement);
    if (!inscription || !inscription.estAcceptee()) {
      throw new AccesRefuse(
        "Vous devez être inscrit et accepté à cet événement pour générer votre QR de présence"
      );
    }

    const dureeSecondes = Math.max(
      60,
      Math.floor((evenement.dateFin.getTime() + TAMPON_APRES_EVENEMENT_MS - Date.now()) / 1000)
    );

    const payload: JetonPresencePayload = { idJoueur, idEvenement, type: "presence" };
    return jwt.sign(payload, getEnvVariable("JWT_SECRET"), { expiresIn: dureeSecondes });
  }

  // Scan par l'organisateur : signature valide, scanneur = organisateur, joueur bien inscrit.
  async validerParQr(idEvenement: number, jeton: string, idOrganisateur: number): Promise<Inscription> {
    const evenement = await this.trouverEvenementOrganise(idEvenement, idOrganisateur);
    const payload = this.decoderJetonPresence(jeton);

    if (payload.idEvenement !== evenement.id) {
      throw new RequeteInvalide("Ce QR ne correspond pas à cet événement");
    }

    return this.marquer(evenement.id, payload.idJoueur);
  }

  // Marquage manuel, en secours (batterie vide, téléphone cassé).
  async marquerManuellement(idEvenement: number, idJoueur: number, idOrganisateur: number): Promise<Inscription> {
    await this.trouverEvenementOrganise(idEvenement, idOrganisateur);
    return this.marquer(idEvenement, idJoueur);
  }

  private async marquer(idEvenement: number, idJoueur: number): Promise<Inscription> {
    const inscription = await this.inscriptionRepository.trouver(idJoueur, idEvenement);

    if (!inscription || !inscription.estAcceptee()) {
      throw new Conflit("Ce joueur n'est pas inscrit (accepté) à cet événement");
    }

    return this.inscriptionRepository.marquerPresence(idJoueur, idEvenement);
  }

  private async trouverEvenementOrganise(idEvenement: number, idOrganisateur: number): Promise<Evenement> {
    const evenement = await this.evenementRepository.trouverParId(idEvenement);

    if (!evenement) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    if (!evenement.estOrganisePar(idOrganisateur)) {
      throw new AccesRefuse("Seul l'organisateur peut gérer les présences de cet événement");
    }

    return evenement;
  }

  private decoderJetonPresence(jeton: string): JetonPresencePayload {
    let payload: unknown;

    try {
      payload = jwt.verify(jeton, getEnvVariable("JWT_SECRET"));
    } catch {
      throw new RequeteInvalide("QR de présence invalide ou expiré");
    }

    const estUnJetonDePresence =
      typeof payload === "object" && payload !== null && (payload as { type?: unknown }).type === "presence";

    if (!estUnJetonDePresence) {
      throw new RequeteInvalide("QR de présence invalide ou expiré");
    }

    return payload as JetonPresencePayload;
  }

  private estAujourdhui(date: Date): boolean {
    const auFormatJour = (d: Date) => d.toISOString().slice(0, 10);
    return auFormatJour(date) === auFormatJour(new Date());
  }
}
