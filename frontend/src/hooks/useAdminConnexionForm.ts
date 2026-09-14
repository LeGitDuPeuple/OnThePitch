import { useCallback, useState, type FormEvent } from "react";
import { useAppDispatch } from "../store/hooks";
import { connexionReussie } from "../store/authSlice";
import { authService } from "../services/authService";
import { ErreurApi } from "../services/api";

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

  const soumettre = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreur(null);
      setChargement(true);

      try {
        const { utilisateur } = await authService.connexion({ email, motDePasse });
        dispatch(connexionReussie(utilisateur));
      } catch (erreurRequete) {
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      } finally {
        setChargement(false);
      }
    },
    [email, motDePasse, dispatch]
  );

  return { email, setEmail, motDePasse, setMotDePasse, erreur, chargement, soumettre };
};
