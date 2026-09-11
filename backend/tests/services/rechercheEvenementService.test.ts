import { RechercheEvenementService } from "../../src/services/rechercheEvenementService";
import { RequeteInvalide } from "../../src/domain/erreurMetier";
import { EvenementRepositoryFake } from "../doubles/EvenementRepositoryFake";

// Double dédié : espionne les paramètres transmis au repository, ce que le
// EvenementRepositoryFake générique ne permet pas (rechercherParRayon y est figé).
class EvenementRepositorySpy extends EvenementRepositoryFake {
  dernierAppel: { longitude: number; latitude: number; rayonMetres: number } | null = null;

  override async rechercherParRayon(longitude: number, latitude: number, rayonMetres: number) {
    this.dernierAppel = { longitude, latitude, rayonMetres };
    return [];
  }
}

describe("RechercheEvenementService", () => {
  it("applique le rayon par défaut (10 km) si aucun n'est fourni", async () => {
    const repository = new EvenementRepositorySpy();
    const service = new RechercheEvenementService(repository);

    await service.rechercherAProximite({ latitude: 48.8566, longitude: 2.3522 });

    expect(repository.dernierAppel?.rayonMetres).toBe(10_000);
  });

  it("convertit le rayon fourni de km en m", async () => {
    const repository = new EvenementRepositorySpy();
    const service = new RechercheEvenementService(repository);

    await service.rechercherAProximite({ latitude: 48.8566, longitude: 2.3522, rayonKm: 25 });

    expect(repository.dernierAppel?.rayonMetres).toBe(25_000);
  });

  it("refuse un rayon supérieur au plafond de 100 km", async () => {
    const service = new RechercheEvenementService(new EvenementRepositorySpy());

    await expect(
      service.rechercherAProximite({ latitude: 48.8566, longitude: 2.3522, rayonKm: 150 })
    ).rejects.toBeInstanceOf(RequeteInvalide);
  });

  it("refuse un rayon négatif ou nul", async () => {
    const service = new RechercheEvenementService(new EvenementRepositorySpy());

    await expect(
      service.rechercherAProximite({ latitude: 48.8566, longitude: 2.3522, rayonKm: 0 })
    ).rejects.toBeInstanceOf(RequeteInvalide);
  });

  it("une recherche sans résultat renvoie une liste vide, pas une erreur", async () => {
    const service = new RechercheEvenementService(new EvenementRepositorySpy());

    const resultats = await service.rechercherAProximite({ latitude: 48.8566, longitude: 2.3522 });

    expect(resultats).toEqual([]);
  });
});
