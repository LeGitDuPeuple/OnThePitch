// Variables d'environnement nécessaires aux Services testés (ex: JWT_SECRET pour
// PresenceService et AuthService). Les tests ne chargent jamais le vrai .env :
// les Services ne dépendent d'aucun repository concret, donc d'aucune connexion réelle.
process.env["JWT_SECRET"] = "jeton-secret-de-test";
