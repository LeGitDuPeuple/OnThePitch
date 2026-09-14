import type { Coordonnees } from "../services/geocodageService";
import "../styles/suggestionsAdresse.css";

type PropsSuggestionsAdresse = {
  suggestions: Coordonnees[];
  onChoisir: (suggestion: Coordonnees) => void;
};

// Liste déroulante sous un champ adresse (recherche, création d'événement —
// cf. maquette 2.2.c "Suggestion d'adresse 1/2"). N'affiche rien tant qu'il
// n'y a pas de candidat — le composant appelant n'a pas à le vérifier lui-même.
export const SuggestionsAdresse = ({ suggestions, onChoisir }: PropsSuggestionsAdresse) => {
  if (suggestions.length === 0) return null;

  return (
    <ul className="suggestions-adresse" role="listbox">
      {suggestions.map((suggestion) => (
        // onMouseDown (pas onClick) : se déclenche avant le blur du champ,
        // qui autrement ferait disparaître la liste avant le clic.
        <li key={suggestion.adresse} role="option">
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onChoisir(suggestion)}>
            {suggestion.adresse}
          </button>
        </li>
      ))}
    </ul>
  );
};
