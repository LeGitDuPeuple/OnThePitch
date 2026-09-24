import { useCallback, useEffect, useState } from "react";
import { moderationService } from "../services/moderationService";
import { ErreurApi } from "../services/api";
import type { SignalementDetail, StatistiquesAdmin } from "../types/moderation";

// Toute la logique du tableau de bord admin : le composant n'affiche que ce que
// ce hook expose (voir CLAUDE.md, "le composant affiche, il ne raisonne pas").
export const useModeration = () => {
  const [signalements, setSignalements] = useState<SignalementDetail[]>([]);
  const [statistiques, setStatistiques] = useState<StatistiquesAdmin | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  // Événement en cours de traitement — ne désactive que la ligne concernée,
  // pas tout le tableau (plusieurs signalements peuvent viser le même événement).
  const [idEvenementEnCours, setIdEvenementEnCours] = useState<number | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const [listeSignalements, statistiquesAdmin] = await Promise.all([
        moderationService.listerSignalements(),
        moderationService.obtenirStatistiques(),
      ]);
      setSignalements(listeSignalements);
      setStatistiques(statistiquesAdmin);
    } catch (erreurRequete) {
      setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const traiter = useCallback(
    async (idEvenement: number, action: "sanctionner" | "rejeter") => {
      setIdEvenementEnCours(idEvenement);
      setErreur(null);
      try {
        if (action === "sanctionner") {
          await moderationService.sanctionner(idEvenement);
        } else {
          await moderationService.rejeter(idEvenement);
        }
        await charger();
      } catch (erreurRequete) {
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      } finally {
        setIdEvenementEnCours(null);
      }
    },
    [charger]
  );

  return { signalements, statistiques, chargement, erreur, idEvenementEnCours, traiter };
};
