import { EvaluationService } from "../../src/services/evaluationService";
import { EvenementService } from "../../src/services/evenementService";
import { Inscription } from "../../src/domain/entities/Inscription";
import { RessourceIntrouvable, AccesRefuse, Conflit } from "../../src/domain/erreurMetier";
import { EvenementRepositoryFake } from "../doubles/EvenementRepositoryFake";
import { InscriptionRepositoryFake } from "../doubles/InscriptionRepositoryFake";
import { EvaluationRepositoryFake } from "../doubles/EvaluationRepositoryFake";
import { NotificationFake } from "../doubles/NotificationFake";
import { GeocodeurFake, coordonneesTest } from "../doubles/GeocodeurFake";

const ORGANISATEUR = 1;
const JOUEUR = 2;

const creerEvenementTermine = async (evenementRepository: EvenementRepositoryFake) => {
  const evenementService = new EvenementService(
    evenementRepository,
    new GeocodeurFake(coordonneesTest),
    new InscriptionRepositoryFake(),
    new NotificationFake(),
    new EvaluationRepositoryFake()
  );
  const evenement = await evenementService.creer(
    {
      titre: "Match du dimanche",
      adresse: "10 Rue de Rivoli, Paris",
      nombrePlaces: 10,
      estPrive: false,
      dateDebut: new Date(Date.now() + 60 * 60 * 1000),
      dateFin: new Date(Date.now() + 3 * 60 * 60 * 1000),
    },
    ORGANISATEUR
  );
  await evenementRepository.terminer(evenement.id);
  return (await evenementRepository.trouverParId(evenement.id))!;
};

const inscrireJoueurAccepte = (inscriptionRepository: InscriptionRepositoryFake, idEvenement: number) => {
  inscriptionRepository.ajouter(
    new Inscription({ idJoueur: JOUEUR, idEvenement, dateInscription: new Date(), statut: "acceptee" })
  );
};

describe("EvaluationService", () => {
  describe("noter", () => {
    it("enregistre l'évaluation d'un joueur accepté sur un événement terminé", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evaluationRepository = new EvaluationRepositoryFake();
      const evenement = await creerEvenementTermine(evenementRepository);
      inscrireJoueurAccepte(inscriptionRepository, evenement.id);
      const service = new EvaluationService(evaluationRepository, evenementRepository, inscriptionRepository);

      const evaluation = await service.noter(evenement.id, JOUEUR, 4, "Bonne organisation");

      expect(evaluation.note).toBe(4);
      expect(evaluation.commentaire).toBe("Bonne organisation");
      expect(evaluation.idJoueur).toBe(JOUEUR);
      expect(evaluation.idEvenement).toBe(evenement.id);
    });

    it("refuse si l'événement n'existe pas", async () => {
      const service = new EvaluationService(
        new EvaluationRepositoryFake(),
        new EvenementRepositoryFake(),
        new InscriptionRepositoryFake()
      );

      await expect(service.noter(999, JOUEUR, 5)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });

    it("refuse que l'organisateur évalue son propre événement", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenementTermine(evenementRepository);
      const service = new EvaluationService(new EvaluationRepositoryFake(), evenementRepository, inscriptionRepository);

      await expect(service.noter(evenement.id, ORGANISATEUR, 5)).rejects.toBeInstanceOf(AccesRefuse);
    });

    it("refuse tant que l'événement n'est pas terminé", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenementService = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await evenementService.creer(
        {
          titre: "Match du dimanche",
          adresse: "10 Rue de Rivoli, Paris",
          nombrePlaces: 10,
          estPrive: false,
          dateDebut: new Date(Date.now() + 60 * 60 * 1000),
          dateFin: new Date(Date.now() + 3 * 60 * 60 * 1000),
        },
        ORGANISATEUR
      );
      inscrireJoueurAccepte(inscriptionRepository, evenement.id);
      const service = new EvaluationService(new EvaluationRepositoryFake(), evenementRepository, inscriptionRepository);

      await expect(service.noter(evenement.id, JOUEUR, 5)).rejects.toBeInstanceOf(Conflit);
    });

    it("refuse un joueur qui n'a pas de demande acceptée sur cet événement", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenementTermine(evenementRepository);
      const service = new EvaluationService(new EvaluationRepositoryFake(), evenementRepository, inscriptionRepository);

      await expect(service.noter(evenement.id, JOUEUR, 5)).rejects.toBeInstanceOf(AccesRefuse);
    });
  });
});
