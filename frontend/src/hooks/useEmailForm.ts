import { useCallback, useState, type FormEvent, type FocusEvent } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { connexionReussie } from "../store/authSlice";
import { compteService } from "../services/compteService";
import { ErreurApi } from "../services/api";
import { validerEmail } from "../utils/validation";

// Changement d'adresse email depuis "Mon compte". Le mot de passe actuel
// confirme l'identité (voir CompteService côté back). L'email étant
// l'identifiant de connexion, l'état d'authentification est remplacé par
// l'utilisateur à jour renvoyé par le serveur.
export const useEmailForm = () => {
  const utilisateur = useAppSelector((state) => state.auth.utilisateur);
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState(utilisateur?.email ?? "");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreurEmail, setErreurEmail] = useState<string | null>(null);
  const [erreurMotDePasse, setErreurMotDePasse] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const validerChampEmail = useCallback((evenement: FocusEvent<HTMLInputElement>) => {
    setErreurEmail(validerEmail(evenement.target.value));
  }, []);

  const soumettre = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreur(null);
      setSucces(null);
      setErreurMotDePasse(null);

      const messageEmail = validerEmail(email);
      setErreurEmail(messageEmail);
      if (messageEmail) return;

      setChargement(true);
      try {
        const misAJour = await compteService.changerEmail(email, motDePasse);
        dispatch(connexionReussie(misAJour));
        setMotDePasse("");
        setSucces("Adresse email mise à jour. Elle sert désormais à vous connecter et à recevoir vos notifications.");
      } catch (erreurRequete) {
        if (erreurRequete instanceof ErreurApi) {
          const champs = erreurRequete.erreursChamps;
          if (champs["email"]) setErreurEmail(champs["email"]);
          else if (champs["motDePasse"]) setErreurMotDePasse(champs["motDePasse"]);
          else setErreur(erreurRequete.message);
        } else {
          setErreur("Une erreur est survenue");
        }
      } finally {
        setChargement(false);
      }
    },
    [email, motDePasse, dispatch]
  );

  return {
    email,
    setEmail,
    motDePasse,
    setMotDePasse,
    erreurEmail,
    erreurMotDePasse,
    validerChampEmail,
    erreur,
    succes,
    effacerSucces: () => setSucces(null),
    chargement,
    soumettre,
  };
};
