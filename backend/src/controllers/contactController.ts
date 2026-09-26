import { Request, Response, NextFunction } from "express";
import { ContactService } from "../services/contactService";
import { contactSchema } from "../schemas/contactSchema";

export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // POST /aide/contact — public (un visiteur doit pouvoir écrire au support)
  envoyer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.contactService.envoyer(contactSchema.parse(req.body));
      res.status(204).send();
    } catch (erreur) {
      next(erreur);
    }
  };
}
