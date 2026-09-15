import { useCallback, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { evenementService } from "../services/evenementService";
import { ErreurApi } from "../services/api";
import type { NiveauRequis } from "../types/evenement";

const NIVEAU_DEFAUT: NiveauRequis = "tous_niveaux";

// Le formulaire éclate la date/heure du back (dateDebut/dateFin, deux Date
// complètes) en trois champs distincts (date, heureDebut, heureFin) : une
// erreur sur "dateDebut" doit s'afficher sous "Date", une sur "dateFin" sous
// "Heure de fin" (c'est elle qui la précède, le plus souvent en cause).
const normaliserChampDate = (champ: string): string => {
  if (champ === "dateDebut") return "date";
  if (champ === "dateFin") return "heureFin";
  return champ;
};

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
  const [format, setFormat] = useState("");
  const [description, setDescription] = useState("");
  const [nombrePlaces, setNombrePlaces] = useState(10);
  const [niveauRequis, setNiveauRequis] = useState<NiveauRequis>(NIVEAU_DEFAUT);

  // Bloc 3 — visibilité
  const [estPrive, setEstPrive] = useState(false);

  const [erreur, setErreur] = useState<string | null>(null);
  // Une entrée par champ fautif (adresse introuvable, date passée...) — voir
  // ErreurApi.erreursChamps. Affichée sous le champ concerné, pas dans le
  // message général : sur un formulaire à 3 blocs, un message générique en
  // bas peut passer inaperçu (signalé par le porteur de projet).
  const [erreursChamps, setErreursChamps] = useState<Record<string, string>>({});
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();

  const soumettre = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreur(null);
      setErreursChamps({});

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
          format: format || undefined,
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
        if (erreurRequete instanceof ErreurApi) {
          setErreur(erreurRequete.message);
          const champsNormalises: Record<string, string> = {};
          Object.entries(erreurRequete.erreursChamps).forEach(([champ, message]) => {
            champsNormalises[normaliserChampDate(champ)] = message;
          });
          setErreursChamps(champsNormalises);
        } else {
          setErreur("Une erreur est survenue");
        }
      } finally {
        setChargement(false);
      }
    },
    [
      titre,
      format,
      description,
      adresse,
      nomLieu,
      date,
      heureDebut,
      heureFin,
      nombrePlaces,
      estPrive,
      typeTerrain,
      niveauRequis,
      navigate,
    ]
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
    format,
    setFormat,
    description,
    setDescription,
    nombrePlaces,
    setNombrePlaces,
    niveauRequis,
    setNiveauRequis,
    estPrive,
    setEstPrive,
    erreur,
    erreursChamps,
    chargement,
    soumettre,
  };
};
