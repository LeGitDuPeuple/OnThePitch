import { useCallback, useState, type FormEvent, type FocusEvent } from "react";
import { aideService } from "../services/aideService";
import { ErreurApi } from "../services/api";
import { validerEmail } from "../utils/validation";

// Formulaire de contact de la page Aide. Prérempli avec l'identité de la
// personne connectée quand elle l'est, jamais obligatoire (un visiteur peut écrire).
export const useContactForm = (nomInitial = "", emailInitial = "") => {
  const [nom, setNom] = useState(nomInitial);
  const [email, setEmail] = useState(emailInitial);
  const [message, setMessage] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const validerChampEmail = useCallback((evenement: FocusEvent<HTMLInputElement>) => {
    const messageEmail = validerEmail(evenement.target.value);
    setErreurs((courantes) => ({ ...courantes, email: messageEmail ?? "" }));
  }, []);

  const soumettre = useCallback(
    async (evenement: FormEvent) => {
      evenement.preventDefault();
      setErreur(null);
      setSucces(null);

      const messageEmail = validerEmail(email);
      const nouvellesErreurs: Record<string, string> = {};
      if (messageEmail) nouvellesErreurs["email"] = messageEmail;
      if (nom.trim().length < 2) nouvellesErreurs["nom"] = "Le nom est obligatoire";
      if (message.trim().length < 10) nouvellesErreurs["message"] = "Le message doit faire au moins 10 caractères";
      setErreurs(nouvellesErreurs);
      if (Object.keys(nouvellesErreurs).length > 0) return;

      setChargement(true);
      try {
        await aideService.envoyerContact({ nom, email, message });
        setMessage("");
        setSucces("Votre message a bien été envoyé. Nous vous répondrons à l'adresse indiquée.");
      } catch (erreurRequete) {
        if (erreurRequete instanceof ErreurApi) {
          setErreurs(erreurRequete.erreursChamps);
          if (Object.keys(erreurRequete.erreursChamps).length === 0) setErreur(erreurRequete.message);
        } else {
          setErreur("Une erreur est survenue");
        }
      } finally {
        setChargement(false);
      }
    },
    [nom, email, message]
  );

  return {
    nom,
    setNom,
    email,
    setEmail,
    message,
    setMessage,
    erreurs,
    validerChampEmail,
    erreur,
    succes,
    effacerSucces: () => setSucces(null),
    chargement,
    soumettre,
  };
};
