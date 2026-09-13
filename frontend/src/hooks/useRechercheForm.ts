import { useCallback, useState } from "react";
import { evenementService } from "../services/evenementService";
import { geocodageService } from "../services/geocodageService";
import { ErreurApi } from "../services/api";
import type { EvenementProche } from "../types/evenement";

const RAYON_DEFAUT_KM = 10;

type PointRecherche = {
  latitude: number;
  longitude: number;
  libelle: string;
};

// Toute la logique de la recherche géolocalisée : le composant ne fait qu'afficher
// ce que ce hook expose (voir CLAUDE.md, "Front React" — "le composant ne raisonne pas").
export const useRechercheForm = () => {
  const [adresse, setAdresse] = useState("");
  const [rayonKm, setRayonKm] = useState(RAYON_DEFAUT_KM);
  const [pointRecherche, setPointRecherche] = useState<PointRecherche | null>(null);
  const [resultats, setResultats] = useState<EvenementProche[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const lancerRecherche = useCallback(async (point: PointRecherche, rayon: number) => {
    setChargement(true);
    setErreur(null);

    try {
      const donnees = await evenementService.rechercher({
        latitude: point.latitude,
        longitude: point.longitude,
        rayonKm: rayon,
      });
      setResultats(donnees);
    } catch (erreurRequete) {
      setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
    } finally {
      setChargement(false);
    }
  }, []);

  // Recherche à partir de l'adresse saisie : géocodée côté serveur, jamais côté client.
  const rechercherParAdresse = useCallback(async () => {
    if (adresse.trim().length < 5) {
      setErreur("Saisissez une adresse ou une ville");
      return;
    }

    setChargement(true);
    setErreur(null);

    try {
      const coordonnees = await geocodageService.geocoder(adresse);
      const point: PointRecherche = {
        latitude: coordonnees.latitude,
        longitude: coordonnees.longitude,
        libelle: coordonnees.adresse,
      };
      setPointRecherche(point);
      await lancerRecherche(point, rayonKm);
    } catch (erreurRequete) {
      setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      setChargement(false);
    }
  }, [adresse, rayonKm, lancerRecherche]);

  // Recherche à partir de la géolocalisation du navigateur.
  const rechercherParPosition = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setErreur("La géolocalisation n'est pas disponible sur cet appareil");
      return;
    }

    setChargement(true);
    setErreur(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: PointRecherche = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          libelle: "Ma position",
        };
        setPointRecherche(point);
        void lancerRecherche(point, rayonKm);
      },
      () => {
        setErreur("Impossible d'obtenir votre position");
        setChargement(false);
      }
    );
  }, [rayonKm, lancerRecherche]);

  // Change le rayon et relance la recherche si un point est déjà défini.
  const definirRayon = useCallback(
    (nouveauRayon: number) => {
      setRayonKm(nouveauRayon);
      if (pointRecherche) {
        void lancerRecherche(pointRecherche, nouveauRayon);
      }
    },
    [pointRecherche, lancerRecherche]
  );

  return {
    adresse,
    setAdresse,
    rayonKm,
    definirRayon,
    pointRecherche,
    resultats,
    chargement,
    erreur,
    rechercherParAdresse,
    rechercherParPosition,
  };
};
