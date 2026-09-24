import { Evaluation } from "../domain/entities/Evaluation";
import { EvaluationRepositoryInterface } from "../domain/interface/evaluationRepositoryInterface";
import { EvenementRepositoryInterface } from "../domain/interface/evenementRepositoryInterface";
import { InscriptionRepositoryInterface } from "../domain/interface/inscriptionRepositoryInterface";
import { RessourceIntrouvable, AccesRefuse, Conflit } from "../domain/erreurMetier";

export class EvaluationService {
  constructor(
    private readonly evaluationRepository: EvaluationRepositoryInterface,
    private readonly evenementRepository: EvenementRepositoryInterface,
    private readonly inscriptionRepository: InscriptionRepositoryInterface
  ) {}

  // Un joueur note l'organisateur, une fois l'événement terminé (voir CLAUDE.md,
  // "Évolutions envisagées" — système d'évaluation). Qui note qui découle du
  // modèle de données : la clé primaire d'`evaluation` est (id_joueur,
  // id_evenement), donc une seule note par joueur et par événement — pas de
  // notation entre joueurs (il faudrait un second id_joueur), pas l'organisateur
  // qui note ses propres joueurs.
  async noter(idEvenement: number, idJoueur: number, note: number, commentaire?: string): Promise<Evaluation> {
    const evenement = await this.evenementRepository.trouverParId(idEvenement);

    if (!evenement) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    if (evenement.estOrganisePar(idJoueur)) {
      throw new AccesRefuse("Vous ne pouvez pas évaluer votre propre événement");
    }

    if (evenement.statut !== "Termine") {
      throw new Conflit("Cet événement n'est pas encore terminé");
    }

    // Réservé aux joueurs acceptés — pas à un simple demandeur en attente ou
    // refusé (voir CLAUDE.md, section 6), ni à un joueur jamais inscrit. Pas de
    // condition sur la présence pointée : le scan QR est un secours, pas
    // systématique, un joueur venu sans avoir été scanné doit pouvoir noter.
    const inscription = await this.inscriptionRepository.trouver(idJoueur, idEvenement);
    if (!inscription || !inscription.estAcceptee()) {
      throw new AccesRefuse("Seul un joueur accepté à cet événement peut l'évaluer");
    }

    // Le doublon (même joueur, même événement) est refusé par le repository,
    // porté par la clé primaire composite — pas de vérification ici.
    return this.evaluationRepository.creer({ idJoueur, idEvenement, note, commentaire });
  }
}
