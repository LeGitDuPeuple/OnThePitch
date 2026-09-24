import { useCallback, useState, type FormEvent } from "react";
import { useAppDispatch } from "../store/hooks";
import { connexionReussie } from "../store/authSlice";
import { authService } from "../services/authService";
import { ErreurApi } from "../services/api";

// Seconde étape de la connexion quand le compte a la double authentification :
// le mot de passe est déjà validé (jeton temporaire de 5 minutes), il reste à
// saisir le code. Partagé par l'écran de connexion et celui de l'admin (même
// connexion, voir CLAUDE.md section 9) ; `apresConnexion` dit quoi faire une
// fois la session ouverte (rediriger, ou rien).
export const useConnexionDoubleAuth = (apresConnexion: () => void) => {
  const [jetonTemporaire, setJetonTemporaire] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const dispatch = useAppDispatch();

  const soumettreCode = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      if (!jetonTemporaire) return;
      setErreur(null);
      setChargement(true);

      try {
        const { utilisateur } = await authService.connexionDoubleAuth(jetonTemporaire, code);
        dispatch(connexionReussie(utilisateur));
        apresConnexion();
      } catch (erreurRequete) {
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      } finally {
        setChargement(false);
      }
    },
    [jetonTemporaire, code, dispatch, apresConnexion]
  );

  // Retour à l'étape mot de passe (jeton expiré, mauvais compte...).
  const recommencer = useCallback(() => {
    setJetonTemporaire(null);
    setCode("");
    setErreur(null);
  }, []);

  return {
    codeRequis: jetonTemporaire !== null,
    demanderCode: setJetonTemporaire,
    code,
    setCode,
    erreur,
    chargement,
    soumettreCode,
    recommencer,
  };
};

export type ConnexionDoubleAuth = ReturnType<typeof useConnexionDoubleAuth>;
