import { useCallback, useEffect, useState } from "react";
import { moderationService } from "../services/moderationService";
import { ErreurApi } from "../services/api";
import type { EvenementAdmin, FiltresEvenementsAdmin } from "../types/moderation";
import type { StatutEvenement } from "../types/evenement";

// Vue d'ensemble admin "tous les événements" — séparée de useModeration
// (signalements + statistiques) : un hook, une responsabilité (voir
// CLAUDE.md, "le composant affiche, il ne raisonne pas").
export const useEvenementsAdmin = () => {
  const [statut, setStatut] = useState<StatutEvenement | "">("");
  const [dateDebutMin, setDateDebutMin] = useState("");
  const [dateDebutMax, setDateDebutMax] = useState("");
  const [evenements, setEvenements] = useState<EvenementAdmin[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const filtres: FiltresEvenementsAdmin = {
        statut: statut || undefined,
        dateDebutMin: dateDebutMin || undefined,
        dateDebutMax: dateDebutMax || undefined,
      };
      setEvenements(await moderationService.listerEvenements(filtres));
    } catch (erreurRequete) {
      setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
    } finally {
      setChargement(false);
    }
  }, [statut, dateDebutMin, dateDebutMax]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return {
    statut,
    setStatut,
    dateDebutMin,
    setDateDebutMin,
    dateDebutMax,
    setDateDebutMax,
    evenements,
    chargement,
    erreur,
  };
};
