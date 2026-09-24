/**
 * Erreur métier : une règle de gestion a été violée.
 * Le gestionnaire d'erreurs la traduit en réponse HTTP.
 */
export abstract class ErreurMetier extends Error {
  abstract readonly statut: number;

  // Nom du champ de formulaire concerné, quand la règle violée pointe sans
  // ambiguïté vers un seul champ (ex. "adresse" pour un géocodage qui échoue).
  // Facultatif : une erreur de permission ou d'état n'en a pas — pas de faux
  // rattachement, et pour la connexion, jamais rempli volontairement (ne pas
  // révéler si c'est l'email ou le mot de passe qui est en cause).
  constructor(
    message: string,
    public readonly champ?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class RessourceIntrouvable extends ErreurMetier {
  readonly statut = 404;
}

export class RequeteInvalide extends ErreurMetier {
  readonly statut = 400;
}

export class NonAuthentifie extends ErreurMetier {
  readonly statut = 401;
}

export class AccesRefuse extends ErreurMetier {
  readonly statut = 403;
}

export class Conflit extends ErreurMetier {
  readonly statut = 409;
}

export class TropDeRequetes extends ErreurMetier {
  readonly statut = 429;
}

export class ServiceIndisponible extends ErreurMetier {
  readonly statut = 503;
}