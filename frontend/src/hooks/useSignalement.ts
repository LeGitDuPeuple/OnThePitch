import { useCallback, useEffect, useState } from "react";
import { moderationService } from "../services/moderationService";
import { ErreurApi } from "../services/api";
import type { Motif } from "../types/moderation";

// Signalement d'un événement par un joueur (voir CLAUDE.md section 8). Charge
// les motifs au montage — table de référence côté back, jamais codée en dur
// ici (c'est justement ce qui manquait pour construire cet écran, voir
// GET /moderation/motifs).
export const useSignalement = (idEvenement: number) => {
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [chargementMotifs, setChargementMotifs] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  useEffect(() => {
    moderationService
      .listerMotifs()
      .then(setMotifs)
      .catch(() => setErreur("Impossible de charger les motifs de signalement"))
      .finally(() => setChargementMotifs(false));
  }, []);

  const signaler = useCallback(
    async (idMotif: number, texteLibre?: string) => {
      setEnvoiEnCours(true);
      setErreur(null);
      try {
        await moderationService.signaler(idEvenement, idMotif, texteLibre);
        setEnvoye(true);
      } catch (erreurRequete) {
        // 409 si doublon (même joueur/événement/motif) — message déjà explicite côté back.
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      } finally {
        setEnvoiEnCours(false);
      }
    },
    [idEvenement]
  );

  return { motifs, chargementMotifs, envoiEnCours, erreur, envoye, signaler };
};
