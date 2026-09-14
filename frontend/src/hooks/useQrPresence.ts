import { useCallback, useState } from "react";
import { presenceService } from "../services/presenceService";
import { ErreurApi } from "../services/api";

// Récupère le jeton de présence à la demande (pas au chargement de la fiche :
// inutile tant que le joueur ne veut pas afficher son QR). Le composant
// FicheEvenement ne fait qu'afficher ce que ce hook expose.
export const useQrPresence = (idEvenement: number) => {
  const [jeton, setJeton] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const afficher = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const { jeton: jetonRecu } = await presenceService.genererJeton(idEvenement);
      setJeton(jetonRecu);
    } catch (erreurRequete) {
      setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
    } finally {
      setChargement(false);
    }
  }, [idEvenement]);

  const masquer = useCallback(() => {
    setJeton(null);
    setErreur(null);
  }, []);

  return { jeton, chargement, erreur, afficher, masquer };
};
