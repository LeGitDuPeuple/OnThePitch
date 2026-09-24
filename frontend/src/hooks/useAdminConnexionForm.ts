import { useCallback, useState, type FormEvent } from "react";
import { useAppDispatch } from "../store/hooks";
import { connexionReussie } from "../store/authSlice";
import { authService } from "../services/authService";
import { ErreurApi } from "../services/api";
import { useConnexionDoubleAuth } from "./useConnexionDoubleAuth";

// Même connexion que l'écran public (POST /auth/connexion, même compte, même mot
// de passe — pas un second système d'authentification, cf. CLAUDE.md section 9).
// Ne redirige pas : une fois connecté, le composant Admin réagit lui-même au
// changement d'état (authSlice) et bascule sur le tableau de bord.
export const useAdminConnexionForm = () => {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const dispatch = useAppDispatch();
  // Rien à faire une fois connecté : le composant Admin réagit à l'état d'auth.
  const doubleAuth = useConnexionDoubleAuth(() => {});

  const soumettre = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreur(null);
      setChargement(true);

      try {
        const reponse = await authService.connexion({ email, motDePasse });
        if (reponse.doubleAuthRequise) {
          doubleAuth.demanderCode(reponse.jetonTemporaire);
          return;
        }
        dispatch(connexionReussie(reponse.utilisateur));
      } catch (erreurRequete) {
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      } finally {
        setChargement(false);
      }
    },
    [email, motDePasse, dispatch, doubleAuth]
  );

  return { email, setEmail, motDePasse, setMotDePasse, erreur, chargement, soumettre, doubleAuth };
};
