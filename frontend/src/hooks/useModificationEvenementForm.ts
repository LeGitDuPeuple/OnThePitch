import { useCallback, useState, type FormEvent } from "react";
import { evenementService } from "../services/evenementService";
import { ErreurApi } from "../services/api";
import type { Evenement, NiveauRequis } from "../types/evenement";

// Formate une Date en valeurs pour <input type="date"> / <input type="time">
// (fuseau local, contrairement à toISOString() qui repasse en UTC).
const versChampsDate = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    heure: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
};

// Même éclatement dateDebut/dateFin -> date/heureDebut/heureFin qu'à la
// création (voir useCreationEvenementForm) : une erreur sur "dateDebut" doit
// s'afficher sous "Date", une sur "dateFin" sous "Heure de fin".
const normaliserChampDate = (champ: string): string => {
  if (champ === "dateDebut") return "date";
  if (champ === "dateFin") return "heureFin";
  return champ;
};

// Formulaire de modification (organisateur uniquement) : mêmes champs qu'à la
// création, sans l'adresse (cf. CLAUDE.md — redéclencherait un géocodage, hors
// périmètre). Le composant ne monte ce hook que pendant l'édition, ce qui donne
// à chaque ouverture un état initial frais dérivé de l'événement courant.
export const useModificationEvenementForm = (evenement: Evenement, onSuccess: () => void) => {
  const debut = versChampsDate(new Date(evenement.dateDebut));
  const fin = versChampsDate(new Date(evenement.dateFin));

  const [titre, setTitre] = useState(evenement.titre);
  const [format, setFormat] = useState(evenement.format ?? "");
  const [description, setDescription] = useState(evenement.description ?? "");
  const [nombrePlaces, setNombrePlaces] = useState(evenement.nombrePlaces);
  const [niveauRequis, setNiveauRequis] = useState<NiveauRequis>(evenement.niveauRequis);
  const [date, setDate] = useState(debut.date);
  const [heureDebut, setHeureDebut] = useState(debut.heure);
  const [heureFin, setHeureFin] = useState(fin.heure);

  const [erreur, setErreur] = useState<string | null>(null);
  const [erreursChamps, setErreursChamps] = useState<Record<string, string>>({});
  const [chargement, setChargement] = useState(false);

  const soumettre = useCallback(
    async (evenementFormulaire: FormEvent) => {
      evenementFormulaire.preventDefault();
      setErreur(null);
      setErreursChamps({});

      if (!date || !heureDebut || !heureFin) {
        setErreur("La date et les heures de début et de fin sont obligatoires");
        return;
      }

      setChargement(true);
      try {
        await evenementService.modifier(evenement.id, {
          titre,
          format: format || undefined,
          description: description.trim() || undefined,
          dateDebut: new Date(`${date}T${heureDebut}`),
          dateFin: new Date(`${date}T${heureFin}`),
          nombrePlaces,
          niveauRequis,
        });
        onSuccess();
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
    [evenement.id, titre, format, description, date, heureDebut, heureFin, nombrePlaces, niveauRequis, onSuccess]
  );

  return {
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
    date,
    setDate,
    heureDebut,
    setHeureDebut,
    heureFin,
    setHeureFin,
    erreur,
    erreursChamps,
    chargement,
    soumettre,
  };
};
