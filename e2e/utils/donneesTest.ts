// Un email unique par exécution : évite les 409 "email déjà utilisé" en
// rejouant la suite plusieurs fois de suite sans réinitialiser la base.
export const emailUnique = (prefixe: string): string => `${prefixe}.${Date.now()}.${Math.floor(Math.random() * 10_000)}@example.com`;

export const MOT_DE_PASSE_TEST = "MotDePasseTest123!";

// Une adresse réelle, géocodable par l'API Adresse du gouvernement — les
// mêmes coordonnées reviennent partout où un événement de test est créé.
export const ADRESSE_TEST = "1 Place de la Concorde, Paris";

export const dansNJours = (n: number): { date: string; heure: string } => {
  const d = new Date(Date.now() + n * 24 * 60 * 60 * 1000);
  return {
    date: d.toISOString().slice(0, 10), // YYYY-MM-DD, attendu par <input type="date">
    heure: "18:00",
  };
};
