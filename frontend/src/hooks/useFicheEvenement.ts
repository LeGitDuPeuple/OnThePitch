import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const navigate = useNavigate();

  const [evenement, setEvenement] = useState<EvenementDetail | null>(null);
  const [inscrits, setInscrits] = useState<InscritDetail[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [actionEnCours, setActionEnCours] = useState(false);
  // Idle, sauf pendant le traitement d'une demande précise (organisateur) — permet
  // de ne désactiver que le bouton concerné, pas toute la liste des inscrits.
  const [idJoueurEnValidation, setIdJoueurEnValidation] = useState<number | null>(null);

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

  // Accepter/refuser une demande — réservé à l'organisateur, événement privé
  // (cf. CLAUDE.md, section 6). La liste complète des inscrits est déjà chargée :
  // on y retrouve les demandes en_attente sans requête supplémentaire.
  const validerDemande = useCallback(
    async (idJoueur: number, accepter: boolean) => {
      setIdJoueurEnValidation(idJoueur);
      setErreur(null);
      try {
        await inscriptionService.validerDemande(idEvenement, idJoueur, accepter);
        await charger();
      } catch (erreurRequete) {
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      } finally {
        setIdJoueurEnValidation(null);
      }
    },
    [idEvenement, charger]
  );

  // Annulation (soft delete) — réservée à l'organisateur (cf. BoutonInscription :
  // le bouton n'est visible que dans cet état). L'événement disparaît de toutes
  // les recherches et sa fiche renvoie 404 ensuite : retour à la carte de
  // recherche, rester dessus n'aurait plus de sens.
  const annulerEvenement = useCallback(async () => {
    setActionEnCours(true);
    setErreur(null);
    try {
      await evenementService.annuler(idEvenement);
      // Confirmation lue par CarteRecherche via useLocation — la fiche elle-même
      // disparaît (404 ensuite), impossible d'y afficher quoi que ce soit après.
      navigate("/", { state: { messageConfirmation: "Événement annulé." } });
    } catch (erreurRequete) {
      setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      setActionEnCours(false);
    }
  }, [idEvenement, navigate]);

  return {
    evenement,
    inscrits,
    chargement,
    erreur,
    etat,
    actionEnCours,
    rejoindre,
    seDesinscrire,
    annulerEvenement,
    idJoueurEnValidation,
    validerDemande,
    // Exposé pour que useModificationEvenementForm recharge la fiche après succès,
    // sans dupliquer la logique de chargement dans un second hook.
    rafraichir: charger,
  };
};
