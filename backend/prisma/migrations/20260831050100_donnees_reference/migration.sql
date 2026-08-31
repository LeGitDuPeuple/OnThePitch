INSERT INTO statut_utilisateur (libelle_statut) VALUES
  ('actif'), ('averti'), ('suspendu');

INSERT INTO niveau_utilisateur (libelle_niveau) VALUES
  ('debutant'), ('intermediaire'), ('confirme');

INSERT INTO statut_event (libelle_event) VALUES
  ('Ouvert'), ('Complet'), ('Termine'), ('Annule');

INSERT INTO niveau_event (libelle_niveau_event) VALUES
  ('debutant'), ('intermediaire'), ('confirme'), ('tous_niveaux');

INSERT INTO motif (libelle) VALUES
  ('Contenu inapproprie'),
  ('Evenement inexistant'),
  ('Informations trompeuses'),
  ('Comportement de organisateur'),
  ('Autre');
