import { useEffect, useState } from "react";
import { evenementService } from "../services/evenementService";
import { ErreurApi } from "../services/api";
import { useAppSelector } from "../store/hooks";
import type { Evenement } from "../types/evenement";

// Regroupe une liste d'événements en "à venir" / "terminés" — logique
// d'affichage pure, aucune règle métier (voir CLAUDE.md, "le composant
// affiche, il ne raisonne pas").
export type GroupeEvenements = {
  aVenir: Evenement[];
  termines: Evenement[];
};

const grouper = (evenements: Evenement[]): GroupeEvenements => ({
  aVenir: evenements.filter((evenement) => evenement.statut !== "Termine"),
  termines: evenements.filter((evenement) => evenement.statut === "Termine"),
});

export const useProfil = () => {
  const utilisateur = useAppSelector((state) => state.auth.utilisateur);
  const [organises, setOrganises] = useState<GroupeEvenements | null>(null);
  const [participe, setParticipe] = useState<GroupeEvenements | null>(null);
  const [enAttente, setEnAttente] = useState<Evenement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!utilisateur) {
      setChargement(false);
      return;
    }

    let annule = false;

    evenementService
      .mesEvenements()
      .then((resultat) => {
        if (annule) return;
        setOrganises(grouper(resultat.organises));
        setParticipe(grouper(resultat.participe));
        setEnAttente(resultat.enAttente);
      })
      .catch((erreurRequete) => {
        if (annule) return;
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });

    return () => {
      annule = true;
    };
  }, [utilisateur]);

  return { utilisateur, organises, participe, enAttente, chargement, erreur };
};
