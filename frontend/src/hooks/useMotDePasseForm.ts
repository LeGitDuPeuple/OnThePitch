import { useCallback, useState, type FormEvent, type FocusEvent } from "react";
import { compteService } from "../services/compteService";
import { ErreurApi } from "../services/api";
import { validerMotDePasse } from "../utils/validation";

// Changement de mot de passe depuis "Mon compte". Les règles de complexité
// s'appliquent au NOUVEAU mot de passe seulement (comme à l'inscription) :
// le mot de passe actuel peut dater d'avant une règle plus stricte.
export const useMotDePasseForm = () => {
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreurActuel, setErreurActuel] = useState<string | null>(null);
  const [erreurNouveau, setErreurNouveau] = useState<string | null>(null);
  const [erreurConfirmation, setErreurConfirmation] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const validerChampNouveau = useCallback((evenement: FocusEvent<HTMLInputElement>) => {
    setErreurNouveau(validerMotDePasse(evenement.target.value));
  }, []);

  const soumettre = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreur(null);
      setSucces(null);
      setErreurActuel(null);

      const messageNouveau = validerMotDePasse(nouveauMotDePasse);
      const messageConfirmation = nouveauMotDePasse !== confirmation ? "Les deux mots de passe ne correspondent pas" : null;
      setErreurNouveau(messageNouveau);
      setErreurConfirmation(messageConfirmation);
      if (messageNouveau || messageConfirmation) return;

      setChargement(true);
      try {
        await compteService.changerMotDePasse(motDePasseActuel, nouveauMotDePasse);
        setMotDePasseActuel("");
        setNouveauMotDePasse("");
        setConfirmation("");
        setSucces("Mot de passe mis à jour.");
      } catch (erreurRequete) {
        if (erreurRequete instanceof ErreurApi) {
          const champs = erreurRequete.erreursChamps;
          if (champs["motDePasseActuel"]) setErreurActuel(champs["motDePasseActuel"]);
          else if (champs["nouveauMotDePasse"]) setErreurNouveau(champs["nouveauMotDePasse"]);
          else setErreur(erreurRequete.message);
        } else {
          setErreur("Une erreur est survenue");
        }
      } finally {
        setChargement(false);
      }
    },
    [motDePasseActuel, nouveauMotDePasse, confirmation]
  );

  return {
    motDePasseActuel,
    setMotDePasseActuel,
    nouveauMotDePasse,
    setNouveauMotDePasse,
    confirmation,
    setConfirmation,
    erreurActuel,
    erreurNouveau,
    erreurConfirmation,
    validerChampNouveau,
    erreur,
    succes,
    effacerSucces: () => setSucces(null),
    chargement,
    soumettre,
  };
};
