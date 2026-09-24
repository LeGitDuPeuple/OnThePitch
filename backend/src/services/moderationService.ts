import { Signalement } from "../domain/entities/Signalement";
import {
  SignalementRepositoryInterface,
  SignalementDetaille,
  MotifSignalement,
} from "../domain/interface/signalementRepositoryInterface";
import {
  EvenementRepositoryInterface,
  FiltresEvenementsAdmin,
  EvenementAvecOrganisateur,
} from "../domain/interface/evenementRepositoryInterface";
import { UtilisateurRepositoryInterface } from "../domain/interface/utilisateurRepositoryInterface";
import { RessourceIntrouvable } from "../domain/erreurMetier";

export type StatistiquesAdmin = {
  totalEvenements: number;
  evenementsActifs: number;
  evenementsTermines: number;
  totalJoueurs: number;
};

export class ModerationService {
  constructor(
    private readonly signalementRepository: SignalementRepositoryInterface,
    private readonly evenementRepository: EvenementRepositoryInterface,
    private readonly utilisateurRepository: UtilisateurRepositoryInterface
  ) {}

  // Motifs disponibles pour signaler un événement — le front n'a pas à coder
  // cette liste en dur (voir CLAUDE.md, "Front React").
  async listerMotifs(): Promise<MotifSignalement[]> {
    return this.signalementRepository.listerMotifs();
  }

  // Un joueur signale un événement.
  async signaler(idEvenement: number, idJoueur: number, idMotif: number, texteLibre?: string): Promise<Signalement> {
    const evenement = await this.evenementRepository.trouverParId(idEvenement);

    if (!evenement || !evenement.estActif()) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    return this.signalementRepository.creer({ idJoueur, idEvenement, idMotif, texteLibre });
  }

  // Liste des signalements à traiter, pour le tableau de bord admin.
  async listerSignalementsEnAttente(): Promise<SignalementDetaille[]> {
    return this.signalementRepository.listerEnAttente();
  }

  // Événement non conforme : désactivation (soft delete) + avertissement à l'organisateur.
  async sanctionner(idEvenement: number): Promise<void> {
    const evenement = await this.evenementRepository.trouverParId(idEvenement);

    if (!evenement || !evenement.estActif()) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    await this.evenementRepository.desactiver(idEvenement);
    await this.utilisateurRepository.avertir(evenement.idOrganisateur);
  }

  // Vue d'ensemble du tableau de bord admin (22/09/2026, à la demande du
  // porteur de projet) — quelques compteurs simples, pas de graphique ni de
  // nouvelle dépendance (voir CLAUDE.md, "Évolutions envisagées").
  async obtenirStatistiques(): Promise<StatistiquesAdmin> {
    const [{ total, actifs, termines }, totalJoueurs] = await Promise.all([
      this.evenementRepository.compterParStatut(),
      this.utilisateurRepository.compterJoueurs(),
    ]);

    return {
      totalEvenements: total,
      evenementsActifs: actifs,
      evenementsTermines: termines,
      totalJoueurs,
    };
  }

  // Vue d'ensemble admin : tous les événements, filtrables — pas juste ceux
  // signalés (contrairement à listerSignalementsEnAttente).
  async listerEvenements(filtres: FiltresEvenementsAdmin): Promise<EvenementAvecOrganisateur[]> {
    return this.evenementRepository.listerTousAdmin(filtres);
  }

  // Faux signalement : l'événement reste actif, les signalements le concernant sont retirés.
  async rejeterSignalements(idEvenement: number): Promise<void> {
    const evenement = await this.evenementRepository.trouverParId(idEvenement);

    if (!evenement) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    await this.signalementRepository.retirer(idEvenement);
  }
}
