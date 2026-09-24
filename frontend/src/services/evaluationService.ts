import { appelApi } from "./api";
import type { Evaluation, NouvelleEvaluation } from "../types/evaluation";

export const evaluationService = {
  // Un joueur note l'organisateur, une fois l'événement terminé (voir
  // CLAUDE.md, "Évolutions envisagées" — système d'évaluation).
  noter: (idEvenement: number, donnees: NouvelleEvaluation): Promise<Evaluation> =>
    appelApi(`/evenements/${idEvenement}/evaluations`, { methode: "POST", corps: donnees }),
};
