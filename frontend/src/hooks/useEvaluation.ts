import { useCallback, useState } from "react";
import { evaluationService } from "../services/evaluationService";
import { ErreurApi } from "../services/api";

// Un joueur note l'organisateur, une fois l'événement terminé (voir
// CLAUDE.md, "Évolutions envisagées" — système d'évaluation). L'éligibilité
// (événement terminé, joueur accepté, pas l'organisateur) est déjà vérifiée
// par useFicheEvenement.peutEvaluer avant d'afficher le formulaire ; ce hook
// ne gère que l'envoi.
export const useEvaluation = (idEvenement: number) => {
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoyee, setEnvoyee] = useState(false);

  const noter = useCallback(
    async (note: number, commentaire?: string) => {
      setEnvoiEnCours(true);
      setErreur(null);
      try {
        await evaluationService.noter(idEvenement, { note, commentaire });
        setEnvoyee(true);
      } catch (erreurRequete) {
        // 409 si déjà évalué (une seule note par joueur et par événement) —
        // message déjà explicite côté back.
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      } finally {
        setEnvoiEnCours(false);
      }
    },
    [idEvenement]
  );

  return { envoiEnCours, erreur, envoyee, noter };
};
