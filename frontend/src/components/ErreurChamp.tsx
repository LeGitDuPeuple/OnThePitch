type PropsErreurChamp = {
  message?: string;
};

// Message d'erreur sous un champ précis (regex email/mot de passe au front,
// ou erreur renvoyée par le serveur pour ce champ — voir ErreurApi.erreursChamps).
// N'affiche rien tant qu'il n'y a pas de message, comme SuggestionsAdresse.
export const ErreurChamp = ({ message }: PropsErreurChamp) => {
  if (!message) return null;
  return (
    <span role="alert" className="message-erreur-champ">
      {message}
    </span>
  );
};
