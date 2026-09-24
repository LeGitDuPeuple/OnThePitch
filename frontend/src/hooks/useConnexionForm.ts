import { useCallback, useState, type FormEvent, type FocusEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../store/hooks";
import { connexionReussie } from "../store/authSlice";
import { authService } from "../services/authService";
import { ErreurApi } from "../services/api";
import { validerEmail } from "../utils/validation";
import { useConnexionDoubleAuth } from "./useConnexionDoubleAuth";

// Toute la logique du formulaire de connexion : le composant Connexion ne fait
// qu'afficher ce que ce hook expose (voir CLAUDE.md, "Front React").
export const useConnexionForm = () => {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  // Le mot de passe n'est jamais revalidé par un regex ici : un compte existant
  // peut avoir été créé avant une règle plus stricte, la connexion ne doit pas
  // se mettre à le refuser (voir utils/validation.ts).
  const [erreurEmail, setErreurEmail] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const versAccueil = useCallback(() => navigate("/"), [navigate]);
  const doubleAuth = useConnexionDoubleAuth(versAccueil);

  const validerChampEmail = useCallback((evenement: FocusEvent<HTMLInputElement>) => {
    setErreurEmail(validerEmail(evenement.target.value));
  }, []);

  const soumettre = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreur(null);

      const messageEmail = validerEmail(email);
      setErreurEmail(messageEmail);
      if (messageEmail) return;

      setChargement(true);
      try {
        const reponse = await authService.connexion({ email, motDePasse });
        // Compte avec double authentification : pas de session encore, on
        // enchaîne avec la saisie du code (voir useConnexionDoubleAuth).
        if (reponse.doubleAuthRequise) {
          doubleAuth.demanderCode(reponse.jetonTemporaire);
          return;
        }
        dispatch(connexionReussie(reponse.utilisateur));
        navigate("/");
      } catch (erreurRequete) {
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      } finally {
        setChargement(false);
      }
    },
    [email, motDePasse, dispatch, navigate, doubleAuth]
  );

  return {
    email,
    setEmail,
    motDePasse,
    setMotDePasse,
    erreurEmail,
    validerChampEmail,
    erreur,
    chargement,
    soumettre,
    doubleAuth,
  };
};
