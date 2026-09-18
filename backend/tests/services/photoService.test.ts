import { PhotoService } from "../../src/services/photoService";
import { RessourceIntrouvable, AccesRefuse, RequeteInvalide } from "../../src/domain/erreurMetier";
import { EvenementRepositoryFake } from "../doubles/EvenementRepositoryFake";
import { LieuRepositoryFake } from "../doubles/LieuRepositoryFake";
import { GeocodeurFake, coordonneesTest } from "../doubles/GeocodeurFake";
import { EvenementService } from "../../src/services/evenementService";

const ORGANISATEUR = 1;
// Signature PNG réelle (8 premiers octets) + contenu arbitraire — le service
// vérifie désormais les octets, pas seulement le typeMime déclaré (voir
// PhotoService.televerser, corrigé suite à SEC-05 du cahier de recette).
const photoTest = { donnees: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]), typeMime: "image/png" };
const fichierNonImage = { donnees: new Uint8Array([0x4d, 0x5a, 1, 2, 3]), typeMime: "image/jpeg" };

const creerEvenement = async (evenementRepository: EvenementRepositoryFake) => {
  const evenementService = new EvenementService(evenementRepository, new GeocodeurFake(coordonneesTest));
  return evenementService.creer(
    {
      titre: "Match avec photo",
      adresse: "10 Rue de Rivoli, Paris",
      nombrePlaces: 10,
      estPrive: false,
      dateDebut: new Date(Date.now() + 24 * 60 * 60 * 1000),
      dateFin: new Date(Date.now() + 26 * 60 * 60 * 1000),
    },
    ORGANISATEUR
  );
};

describe("PhotoService", () => {
  describe("televerser", () => {
    it("enregistre la photo du lieu quand l'organisateur dépose un fichier", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const lieuRepository = new LieuRepositoryFake();
      const evenement = await creerEvenement(evenementRepository);
      const service = new PhotoService(lieuRepository, evenementRepository);

      await service.televerser(evenement.id, ORGANISATEUR, photoTest);

      await expect(lieuRepository.trouverPhoto(evenement.idLieu)).resolves.toEqual(photoTest);
    });

    it("refuse le dépôt par un non-organisateur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const evenement = await creerEvenement(evenementRepository);
      const service = new PhotoService(new LieuRepositoryFake(), evenementRepository);

      await expect(service.televerser(evenement.id, 99, photoTest)).rejects.toBeInstanceOf(AccesRefuse);
    });

    it("refuse le dépôt sur un événement inexistant", async () => {
      const service = new PhotoService(new LieuRepositoryFake(), new EvenementRepositoryFake());

      await expect(service.televerser(999, ORGANISATEUR, photoTest)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });

    // SEC-05 (cahier de recette) : un fichier renommé avec une extension
    // d'image (Content-Type déclaré par le client, donc falsifiable) mais dont
    // le contenu réel n'en est pas une doit être refusé — pas seulement filtré
    // sur l'extension ou le mimetype déclaré (voir Multer, routes/photoRoute.ts).
    it("refuse un fichier dont le contenu ne correspond à aucune signature d'image connue", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const evenement = await creerEvenement(evenementRepository);
      const service = new PhotoService(new LieuRepositoryFake(), evenementRepository);

      await expect(service.televerser(evenement.id, ORGANISATEUR, fichierNonImage)).rejects.toBeInstanceOf(RequeteInvalide);
    });
  });

  describe("recuperer", () => {
    it("renvoie la photo déposée", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const lieuRepository = new LieuRepositoryFake();
      const evenement = await creerEvenement(evenementRepository);
      const service = new PhotoService(lieuRepository, evenementRepository);
      await service.televerser(evenement.id, ORGANISATEUR, photoTest);

      await expect(service.recuperer(evenement.id)).resolves.toEqual(photoTest);
    });

    it("lève RessourceIntrouvable si aucune photo n'a été déposée", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const evenement = await creerEvenement(evenementRepository);
      const service = new PhotoService(new LieuRepositoryFake(), evenementRepository);

      await expect(service.recuperer(evenement.id)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });
  });
});
