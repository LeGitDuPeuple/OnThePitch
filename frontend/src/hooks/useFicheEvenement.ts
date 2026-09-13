import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { evenementService } from "../services/evenementService";
import { inscriptionService } from "../services/inscriptionService";
import { ErreurApi } from "../services/api";
import { useAppSelector } from "../store/hooks";
import type { EvenementDetail, InscritDetail } from "../types/evenement";

// États du bouton d'inscription (cf. CLAUDE.md, section 9 — "Fiche événement").
export type EtatInscription =
  | "non_connecte"
  | "organisateur"
  | "inscription_possible"
  | "demande_possible" // événement privé, pas encore de demande
  | "en_attente"
  | "inscrit"
  | "complet"
  | "termine";

// Toute la logique de la fiche événement : le composant n'affiche que ce que ce
// hook expose (voir CLAUDE.md, "le composant affiche, il ne raisonne pas").
export const useFicheEvenement = () => {
  const { id } = useParams<{ id: string }>();
  const idEvenement = Number(id);
  const utilisateur = useAppSelector((state) => state.auth.utilisateur);

  const [evenement, setEvenement] = useState<EvenementDetail | null>(null);
  const [inscrits, setInscrits] = useState<InscritDetail[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [actionEnCours, setActionEnCours] = useState(false);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const [detail, listeInscrits] = await Promise.all([
        evenementService.trouverParId(idEvenement),
        inscriptionService.lister(idEvenement),
      ]);
      setEvenement(detail);
      setInscrits(listeInscrits);
    } catch (erreurRequete) {
      setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
    } finally {
      setChargement(false);
    }
  }, [idEvenement]);

  useEffect(() => {
    if (!Number.isInteger(idEvenement)) {
      setErreur("Identifiant d'événement invalide");
      setChargement(false);
      return;
    }
    void charger();
  }, [idEvenement, charger]);

  const monInscription = utilisateur ? (inscrits.find((inscrit) => inscrit.idJoueur === utilisateur.id) ?? null) : null;

  const etat: EtatInscription = (() => {
    if (!evenement) return "complet"; // valeur neutre, non affichée tant que evenement est null
    if (evenement.statut === "Termine" || evenement.statut === "Annule") return "termine";
    if (!utilisateur) return "non_connecte";
    if (utilisateur.id === evenement.idOrganisateur) return "organisateur";
    if (monInscription?.statut === "acceptee") return "inscrit";
    if (monInscription?.statut === "en_attente") return "en_attente";
    if (evenement.statut === "Complet") return "complet";
    return evenement.estPrive ? "demande_possible" : "inscription_possible";
  })();

  const rejoindre = useCallback(async () => {
    setActionEnCours(true);
    setErreur(null);
    try {
      await inscriptionService.rejoindre(idEvenement);
      await charger();
    } catch (erreurRequete) {
      setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
    } finally {
      setActionEnCours(false);
    }
  }, [idEvenement, charger]);

  const seDesinscrire = useCallback(async () => {
    setActionEnCours(true);
    setErreur(null);
    try {
      await inscriptionService.seDesinscrire(idEvenement);
      await charger();
    } catch (erreurRequete) {
      setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
    } finally {
      setActionEnCours(false);
    }
  }, [idEvenement, charger]);

  return {
    evenement,
    inscrits,
    chargement,
    erreur,
    etat,
    actionEnCours,
    rejoindre,
    seDesinscrire,
  };
};
