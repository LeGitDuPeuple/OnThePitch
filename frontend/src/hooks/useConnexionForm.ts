import { useCallback, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../store/hooks";
import { connexionReussie } from "../store/authSlice";
import { authService } from "../services/authService";
import { ErreurApi } from "../services/api";

// Toute la logique du formulaire de connexion : le composant Connexion ne fait
// qu'afficher ce que ce hook expose (voir CLAUDE.md, "Front React").
export const useConnexionForm = () => {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const soumettre = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreur(null);
      setChargement(true);

      try {
        const { utilisateur } = await authService.connexion({ email, motDePasse });
        dispatch(connexionReussie(utilisateur));
        navigate("/");
      } catch (erreurRequete) {
        setErreur(erreurRequete instanceof ErreurApi ? erreurRequete.message : "Une erreur est survenue");
      } finally {
        setChargement(false);
      }
    },
    [email, motDePasse, dispatch, navigate]
  );

  return { email, setEmail, motDePasse, setMotDePasse, erreur, chargement, soumettre };
};
