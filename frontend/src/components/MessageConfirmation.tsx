type PropsMessageConfirmation = {
  message: string | null;
  onFermer: () => void;
};

// Bandeau vert de confirmation (ex. "Événement annulé.") — voir
// hooks/useMessageConfirmation.ts pour la logique (lecture du state de
// navigation, effacement au montage pour ne pas réapparaître au F5).
export const MessageConfirmation = ({ message, onFermer }: PropsMessageConfirmation) => {
  if (!message) return null;

  return (
    <p role="status" className="message-confirmation">
      {message}
      <button type="button" onClick={onFermer} aria-label="Fermer">
        ×
      </button>
    </p>
  );
};
