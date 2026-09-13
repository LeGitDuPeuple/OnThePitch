import { useCallback, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { evenementService } from "../services/evenementService";
import { ErreurApi } from "../services/api";
import type { NiveauRequis } from "../types/evenement";

const NIVEAU_DEFAUT: NiveauRequis = "tous_niveaux";

// Toute la logique du formulaire en trois blocs (lieu et date, caractéristiques,
// visibilité — voir CLAUDE.md section 5) : le composant CreationAnnonce ne fait
// qu'afficher ce que ce hook expose (voir CLAUDE.md, "Front React").
export const useCreationEvenementForm = () => {
  // Bloc 1 — lieu et date
  const [adresse, setAdresse] = useState("");
  const [nomLieu, setNomLieu] = useState("");
  const [typeTerrain, setTypeTerrain] = useState("");
  const [date, setDate] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");

  // Bloc 2 — caractéristiques
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [nombrePlaces, setNombrePlaces] = useState(10);
  const [niveauRequis, setNiveauRequis] = useState<NiveauRequis>(NIVEAU_DEFAUT);

  // Bloc 3 — visibilité
  const [estPrive, setEstPrive] = useState(false);

  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();

  const soumettre = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreur(null);

      if (!date || !heureDebut || !heureFin) {
        setErreur("La date et les heures de début et de fin sont obligatoires");
        return;
      }

      const dateDebut = new Date(`${date}T${heureDebut}`);
      const dateFin = new Date(`${date}T${heureFin}`);

      setChargement(true);
      try {
        const evenementCree = await evenementService.creer({
          titre,
          description: description.trim() || undefined,
          adresse,
          nomLieu: nomLieu.trim() || undefined,
          dateDebut,
          dateFin,
          nombrePlaces,
          estPrive,
          typeTerrain: typeTerrain.trim() || undefined,
          niveauRequis,
        });
        navigate(`/evenements/${evenementCree.id}`);
      } catch (erreurRequete) {
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      } finally {
        setChargement(false);
      }
    },
    [titre, description, adresse, nomLieu, date, heureDebut, heureFin, nombrePlaces, estPrive, typeTerrain, niveauRequis, navigate]
  );

  return {
    adresse,
    setAdresse,
    nomLieu,
    setNomLieu,
    typeTerrain,
    setTypeTerrain,
    date,
    setDate,
    heureDebut,
    setHeureDebut,
    heureFin,
    setHeureFin,
    titre,
    setTitre,
    description,
    setDescription,
    nombrePlaces,
    setNombrePlaces,
    niveauRequis,
    setNiveauRequis,
    estPrive,
    setEstPrive,
    erreur,
    chargement,
    soumettre,
  };
};
