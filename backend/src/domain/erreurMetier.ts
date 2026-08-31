/**
 * Erreur métier : une règle de gestion a été violée.
 * Le gestionnaire d'erreurs la traduit en réponse HTTP.
 */
export abstract class ErreurMetier extends Error {
  abstract readonly statut: number;

  constructor(message: string) {
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