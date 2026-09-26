import { useCallback, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { deconnexionReussie } from "../store/authSlice";
import { compteService } from "../services/compteService";
import { ErreurApi } from "../services/api";

type Etape = "repos" | "confirmation";

// Suppression du compte depuis "Mon compte", en deux temps (comme l'annulation
// d'un événement) : un premier clic ouvre la confirmation, jamais de suppression
// directe. Le serveur efface le cookie ; le front n'a qu'à vider son état.
export const useSuppressionCompte = () => {
  const doubleAuthActive = useAppSelector((state) => state.auth.utilisateur?.doubleAuthActive ?? false);
  const dispatch = useAppDispatch();
  const naviguer = useNavigate();
  const [etape, setEtape] = useState<Etape>("repos");
  const [motDePasse, setMotDePasse] = useState("");
  const [code, setCode] = useState("");
  const [erreurMotDePasse, setErreurMotDePasse] = useState<string | null>(null);
  const [erreurCode, setErreurCode] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const reinitialiser = useCallback(() => {
    setMotDePasse("");
    setCode("");
    setErreurMotDePasse(null);
    setErreurCode(null);
    setErreur(null);
  }, []);

  const commencer = useCallback(() => {
    reinitialiser();
    setEtape("confirmation");
  }, [reinitialiser]);

  const annuler = useCallback(() => {
    reinitialiser();
    setEtape("repos");
  }, [reinitialiser]);

  const soumettre = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreurMotDePasse(null);
      setErreurCode(null);
      setErreur(null);
      setChargement(true);

      try {
        await compteService.supprimerCompte(motDePasse, doubleAuthActive ? code : undefined);
        dispatch(deconnexionReussie());
        naviguer("/", { replace: true });
      } catch (erreurRequete) {
        if (erreurRequete instanceof ErreurApi) {
          const champs = erreurRequete.erreursChamps;
          if (champs["motDePasse"]) setErreurMotDePasse(champs["motDePasse"]);
          else if (champs["code"]) setErreurCode(champs["code"]);
          else setErreur(erreurRequete.message);
        } else {
          setErreur("Une erreur est survenue");
        }
        setChargement(false);
      }
    },
    [motDePasse, code, doubleAuthActive, dispatch, naviguer]
  );

  return {
    etape,
    doubleAuthActive,
    motDePasse,
    setMotDePasse,
    code,
    setCode,
    erreurMotDePasse,
    erreurCode,
    erreur,
    chargement,
    commencer,
    annuler,
    soumettre,
  };
};
