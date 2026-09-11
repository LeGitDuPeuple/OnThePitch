import { PresenceService } from "../../src/services/presenceService";
import { Inscription } from "../../src/domain/entities/Inscription";
import { RessourceIntrouvable, AccesRefuse, RequeteInvalide, Conflit } from "../../src/domain/erreurMetier";
import { EvenementRepositoryFake } from "../doubles/EvenementRepositoryFake";
import { InscriptionRepositoryFake } from "../doubles/InscriptionRepositoryFake";
import { GeocodeurFake, coordonneesTest } from "../doubles/GeocodeurFake";
import { EvenementService } from "../../src/services/evenementService";

const ORGANISATEUR = 1;
const JOUEUR = 2;

// Événement dont dateDebut/dateFin tombent aujourd'hui : condition nécessaire
// pour générer un QR de présence (voir PresenceService.estAujourdhui).
const creerEvenementAujourdhui = async (evenementRepository: EvenementRepositoryFake) => {
  const evenementService = new EvenementService(evenementRepository, new GeocodeurFake(coordonneesTest));
  return evenementService.creer(
    {
      titre: "Match du jour",
      adresse: "10 Rue de Rivoli, Paris",
      nombrePlaces: 10,
      estPrive: false,
      dateDebut: new Date(Date.now() + 60 * 60 * 1000),
      dateFin: new Date(Date.now() + 3 * 60 * 60 * 1000),
    },
    ORGANISATEUR
  );
};

const inscrireJoueur = (inscriptionRepository: InscriptionRepositoryFake, idEvenement: number) => {
  inscriptionRepository.ajouter(
    new Inscription({ idJoueur: JOUEUR, idEvenement, dateInscription: new Date(), statut: "acceptee" })
  );
};

describe("PresenceService", () => {
  describe("genererJetonPresence", () => {
    it("génère un jeton pour un joueur inscrit et accepté, le jour de l'événement", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenementAujourdhui(evenementRepository);
      inscrireJoueur(inscriptionRepository, evenement.id);
      const service = new PresenceService(inscriptionRepository, evenementRepository);

      const jeton = await service.genererJetonPresence(evenement.id, JOUEUR);

      expect(typeof jeton).toBe("string");
      expect(jeton.split(".")).toHaveLength(3);
    });

    it("refuse si le joueur n'est pas inscrit et accepté", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const evenement = await creerEvenementAujourdhui(evenementRepository);
      const service = new PresenceService(new InscriptionRepositoryFake(), evenementRepository);

      await expect(service.genererJetonPresence(evenement.id, JOUEUR)).rejects.toBeInstanceOf(AccesRefuse);
    });

    it("refuse si l'événement n'a pas lieu aujourd'hui", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenementService = new EvenementService(evenementRepository, new GeocodeurFake(coordonneesTest));
      const evenement = await evenementService.creer(
        {
          titre: "Match dans une semaine",
          adresse: "10 Rue de Rivoli, Paris",
          nombrePlaces: 10,
          estPrive: false,
          dateDebut: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          dateFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        },
        ORGANISATEUR
      );
      inscrireJoueur(inscriptionRepository, evenement.id);
      const service = new PresenceService(inscriptionRepository, evenementRepository);

      await expect(service.genererJetonPresence(evenement.id, JOUEUR)).rejects.toBeInstanceOf(RequeteInvalide);
    });

    it("refuse si l'événement n'existe pas", async () => {
      const service = new PresenceService(new InscriptionRepositoryFake(), new EvenementRepositoryFake());

      await expect(service.genererJetonPresence(999, JOUEUR)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });
  });

  describe("validerParQr", () => {
    it("alimente la présence quand l'organisateur scanne un jeton valide", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenementAujourdhui(evenementRepository);
      inscrireJoueur(inscriptionRepository, evenement.id);
      const service = new PresenceService(inscriptionRepository, evenementRepository);
      const jeton = await service.genererJetonPresence(evenement.id, JOUEUR);

      const inscription = await service.validerParQr(evenement.id, jeton, ORGANISATEUR);

      expect(inscription.presence).not.toBeNull();
    });

    it("refuse le scan par un non-organisateur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenementAujourdhui(evenementRepository);
      inscrireJoueur(inscriptionRepository, evenement.id);
      const service = new PresenceService(inscriptionRepository, evenementRepository);
      const jeton = await service.genererJetonPresence(evenement.id, JOUEUR);

      await expect(service.validerParQr(evenement.id, jeton, 42)).rejects.toBeInstanceOf(AccesRefuse);
    });

    it("refuse un jeton invalide", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const evenement = await creerEvenementAujourdhui(evenementRepository);
      const service = new PresenceService(new InscriptionRepositoryFake(), evenementRepository);

      await expect(service.validerParQr(evenement.id, "jeton.invalide.ici", ORGANISATEUR)).rejects.toBeInstanceOf(
        RequeteInvalide
      );
    });

    it("refuse un jeton émis pour un autre événement", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenementA = await creerEvenementAujourdhui(evenementRepository);
      const evenementB = await creerEvenementAujourdhui(evenementRepository);
      inscrireJoueur(inscriptionRepository, evenementA.id);
      const service = new PresenceService(inscriptionRepository, evenementRepository);
      const jeton = await service.genererJetonPresence(evenementA.id, JOUEUR);

      await expect(service.validerParQr(evenementB.id, jeton, ORGANISATEUR)).rejects.toBeInstanceOf(RequeteInvalide);
    });
  });

  describe("marquerManuellement", () => {
    it("alimente la présence en secours, sans passer par le QR", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenementAujourdhui(evenementRepository);
      inscrireJoueur(inscriptionRepository, evenement.id);
      const service = new PresenceService(inscriptionRepository, evenementRepository);

      const inscription = await service.marquerManuellement(evenement.id, JOUEUR, ORGANISATEUR);

      expect(inscription.presence).not.toBeNull();
    });

    it("refuse si le joueur n'est pas inscrit et accepté", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const evenement = await creerEvenementAujourdhui(evenementRepository);
      const service = new PresenceService(new InscriptionRepositoryFake(), evenementRepository);

      await expect(service.marquerManuellement(evenement.id, JOUEUR, ORGANISATEUR)).rejects.toBeInstanceOf(Conflit);
    });
  });
});
