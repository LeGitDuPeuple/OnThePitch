import type { TypeMessageConfirmation } from "../hooks/useMessageConfirmation";

type PropsMessageConfirmation = {
  message: string | null;
  type?: TypeMessageConfirmation;
  onFermer: () => void;
};

// Bandeau de confirmation (vert, ex. "Événement annulé.") ou d'avertissement
// (ambre, ex. "événement créé mais photo refusée") — voir
// hooks/useMessageConfirmation.ts pour la logique (lecture du state de
// navigation, effacement au montage pour ne pas réapparaître au F5).
export const MessageConfirmation = ({ message, type = "succes", onFermer }: PropsMessageConfirmation) => {
  if (!message) return null;

  const classe = type === "avertissement" ? "message-confirmation message-confirmation--avertissement" : "message-confirmation";

  return (
    <p role="status" className={classe}>
      {message}
      <button type="button" onClick={onFermer} aria-label="Fermer">
        ×
      </button>
    </p>
  );
};
