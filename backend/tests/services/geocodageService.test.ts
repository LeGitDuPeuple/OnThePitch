import { GeocodageService } from "../../src/services/geocodageService";
import { RequeteInvalide, ServiceIndisponible } from "../../src/domain/erreurMetier";

// GeocodageService n'a pas de repository à substituer : c'est fetch() lui-même
// (son seul accès au monde extérieur) qu'on remplace par un double.
const simulerReponse = (corps: unknown, ok = true): Response => {
  return { ok, json: async () => corps } as Response;
};

describe("GeocodageService", () => {
  it("convertit la première réponse de l'API Adresse en coordonnées", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      simulerReponse({
        features: [
          {
            geometry: { coordinates: [2.3522, 48.8566] }, // [longitude, latitude]
            properties: { label: "10 Rue de Rivoli 75004 Paris", city: "Paris", postcode: "75004" },
          },
        ],
      })
    );
    const service = new GeocodageService();

    const coordonnees = await service.geocoder("10 Rue de Rivoli, Paris");

    expect(coordonnees.longitude).toBe(2.3522);
    expect(coordonnees.latitude).toBe(48.8566);
    expect(coordonnees.ville).toBe("Paris");
  });

  it("refuse une adresse que l'API ne reconnaît pas (liste vide)", async () => {
    global.fetch = jest.fn().mockResolvedValue(simulerReponse({ features: [] }));
    const service = new GeocodageService();

    await expect(service.geocoder("adresse inexistante")).rejects.toBeInstanceOf(RequeteInvalide);
  });

  it("signale un service indisponible si la requête échoue", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));
    const service = new GeocodageService();

    await expect(service.geocoder("10 Rue de Rivoli, Paris")).rejects.toBeInstanceOf(ServiceIndisponible);
  });

  it("signale un service indisponible si l'API répond en erreur", async () => {
    global.fetch = jest.fn().mockResolvedValue(simulerReponse({}, false));
    const service = new GeocodageService();

    await expect(service.geocoder("10 Rue de Rivoli, Paris")).rejects.toBeInstanceOf(ServiceIndisponible);
  });
});
