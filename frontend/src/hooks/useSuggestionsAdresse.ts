import { useCallback, useEffect, useRef, useState } from "react";
import { geocodageService, type Coordonnees } from "../services/geocodageService";

const DELAI_DEBOUNCE_MS = 300;
const LONGUEUR_MIN = 5; // même seuil que le schéma Zod côté back (geocodageSchema).

// Autocomplétion d'adresse, partagée par la recherche et la création
// d'événement (visible sur la maquette, bloc "Lieu et date"). Interroge le
// serveur après une courte pause dans la frappe, jamais à chaque caractère —
// le serveur reste le seul point de contact avec l'API Adresse (CLAUDE.md,
// section 3), donc chaque caractère tapé coûterait un aller-retour sinon.
export const useSuggestionsAdresse = (adresse: string) => {
  const [suggestions, setSuggestions] = useState<Coordonnees[]>([]);
  const delaiRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requeteRef = useRef(0);
  // Adresse du dernier candidat choisi : évite de rouvrir immédiatement une
  // liste de suggestions juste après en avoir sélectionné une.
  const dernierChoixRef = useRef<string | null>(null);

  useEffect(() => {
    if (delaiRef.current) clearTimeout(delaiRef.current);

    if (adresse.trim().length < LONGUEUR_MIN || adresse === dernierChoixRef.current) {
      setSuggestions([]);
      return;
    }

    delaiRef.current = setTimeout(() => {
      const idRequete = ++requeteRef.current;
      geocodageService
        .suggerer(adresse)
        .then((resultats) => {
          if (idRequete === requeteRef.current) setSuggestions(resultats);
        })
        .catch(() => {
          if (idRequete === requeteRef.current) setSuggestions([]);
        });
    }, DELAI_DEBOUNCE_MS);

    return () => {
      if (delaiRef.current) clearTimeout(delaiRef.current);
    };
  }, [adresse]);

  // Renvoie le libellé exact à mettre dans le champ — le composant appelant
  // fait le setAdresse(...), cf. CLAUDE.md "le composant ne raisonne pas".
  const choisir = useCallback((suggestion: Coordonnees): string => {
    dernierChoixRef.current = suggestion.adresse;
    setSuggestions([]);
    return suggestion.adresse;
  }, []);

  // Ferme la liste sans mémoriser de choix (perte de focus sans sélection) —
  // sans effet sur une future recherche si l'utilisateur reprend la saisie.
  const fermer = useCallback(() => setSuggestions([]), []);

  return { suggestions, choisir, fermer };
};
