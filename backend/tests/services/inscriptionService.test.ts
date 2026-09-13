import { InscriptionService } from "../../src/services/inscriptionService";
import { RessourceIntrouvable, AccesRefuse, Conflit } from "../../src/domain/erreurMetier";
import { EvenementRepositoryFake } from "../doubles/EvenementRepositoryFake";
import { InscriptionRepositoryFake } from "../doubles/InscriptionRepositoryFake";
import { GeocodeurFake, coordonneesTest } from "../doubles/GeocodeurFake";
import { EvenementService } from "../../src/services/evenementService";

const dansUneSemaine = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const dansUneSemaineEtDeuxHeures = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);

// Prépare un événement via le vrai EvenementService (plutôt que de construire
// l'entité à la main) : les tests restent valides si sa forme évolue.
const creerEvenement = async (
  evenementRepository: EvenementRepositoryFake,
  estPrive: boolean,
  nombrePlaces = 10
) => {
  const evenementService = new EvenementService(evenementRepository, new GeocodeurFake(coordonneesTest));
  return evenementService.creer(
    {
      titre: "Match du dimanche",
      adresse: "10 Rue de Rivoli, Paris",
      nombrePlaces,
      estPrive,
      dateDebut: dansUneSemaine(),
      dateFin: dansUneSemaineEtDeuxHeures(),
    },
    1 // organisateur
  );
};

describe("InscriptionService", () => {
  describe("rejoindre", () => {
    it("inscrit directement un joueur sur un événement public", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenement(evenementRepository, false);
      const service = new InscriptionService(inscriptionRepository, evenementRepository);

      const inscription = await service.rejoindre(evenement.id, 2);

      expect(inscription.statut).toBe("acceptee");
    });

    it("met la demande en attente sur un événement privé", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenement(evenementRepository, true);
      const service = new InscriptionService(inscriptionRepository, evenementRepository);

      const inscription = await service.rejoindre(evenement.id, 2);

      expect(inscription.statut).toBe("en_attente");
    });

    it("refuse une deuxième demande du même joueur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenement(evenementRepository, false);
      const service = new InscriptionService(inscriptionRepository, evenementRepository);
      await service.rejoindre(evenement.id, 2);

      await expect(service.rejoindre(evenement.id, 2)).rejects.toBeInstanceOf(Conflit);
    });

    it("refuse de rejoindre un événement inexistant", async () => {
      const service = new InscriptionService(new InscriptionRepositoryFake(), new EvenementRepositoryFake());

      await expect(service.rejoindre(999, 2)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });

    it("refuse de rejoindre un événement déjà complet", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenement(evenementRepository, false, 1);
      const service = new InscriptionService(inscriptionRepository, evenementRepository);

      // Le contrôle des places vit dans la vraie base (voir InscriptionRepositoryDatabase,
      // testée manuellement en conditions de concurrence) : ici on simule directement
      // l'état "complet" plutôt que de reproduire ce mécanisme dans le double de test.
      evenement.nombreInscrits = 1;

      await expect(service.rejoindre(evenement.id, 3)).rejects.toBeInstanceOf(Conflit);
    });
  });

  describe("validerDemande", () => {
    it("l'organisateur peut accepter une demande en attente", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenement(evenementRepository, true);
      const service = new InscriptionService(inscriptionRepository, evenementRepository);
      await service.rejoindre(evenement.id, 2);

      const inscription = await service.validerDemande(evenement.id, 2, 1, true);

      expect(inscription.statut).toBe("acceptee");
    });

    it("l'organisateur peut refuser une demande en attente", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenement(evenementRepository, true);
      const service = new InscriptionService(inscriptionRepository, evenementRepository);
      await service.rejoindre(evenement.id, 2);

      const inscription = await service.validerDemande(evenement.id, 2, 1, false);

      expect(inscription.statut).toBe("refusee");
    });

    it("refuse la validation par un non-organisateur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenement(evenementRepository, true);
      const service = new InscriptionService(inscriptionRepository, evenementRepository);
      await service.rejoindre(evenement.id, 2);

      await expect(service.validerDemande(evenement.id, 2, 99, true)).rejects.toBeInstanceOf(AccesRefuse);
    });

    it("refuse s'il n'y a pas de demande en attente pour ce joueur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenement(evenementRepository, true);
      const service = new InscriptionService(inscriptionRepository, evenementRepository);

      await expect(service.validerDemande(evenement.id, 2, 1, true)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });
  });

  describe("lister", () => {
    it("liste les inscrits d'un événement, avec leur statut", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenement(evenementRepository, true);
      const service = new InscriptionService(inscriptionRepository, evenementRepository);
      await service.rejoindre(evenement.id, 2);
      await service.validerDemande(evenement.id, 2, 1, true);
      await service.rejoindre(evenement.id, 3);

      const inscrits = await service.lister(evenement.id);

      expect(inscrits).toEqual([
        expect.objectContaining({ idJoueur: 2, statut: "acceptee" }),
        expect.objectContaining({ idJoueur: 3, statut: "en_attente" }),
      ]);
    });

    it("refuse de lister les inscrits d'un événement inexistant", async () => {
      const service = new InscriptionService(new InscriptionRepositoryFake(), new EvenementRepositoryFake());

      await expect(service.lister(999)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });
  });

  describe("desinscrire", () => {
    it("retire l'inscription du joueur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenement(evenementRepository, false);
      const service = new InscriptionService(inscriptionRepository, evenementRepository);
      await service.rejoindre(evenement.id, 2);

      await service.desinscrire(evenement.id, 2);

      await expect(inscriptionRepository.trouver(2, evenement.id)).resolves.toBeNull();
    });

    it("refuse la désinscription si le joueur n'est pas inscrit", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const evenement = await creerEvenement(evenementRepository, false);
      const service = new InscriptionService(inscriptionRepository, evenementRepository);

      await expect(service.desinscrire(evenement.id, 2)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });
  });
});
