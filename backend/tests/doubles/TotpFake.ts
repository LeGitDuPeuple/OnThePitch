import { TotpInterface } from "../../src/domain/interface/totpInterface";

// Le seul code accepté par ce double : pas de vraie horloge dans les tests.
export const CODE_TOTP_VALIDE = "123456";

export class TotpFake implements TotpInterface {
  genererSecret(): string {
    return "SECRETDETEST";
  }

  construireUri(email: string, secret: string): string {
    return `otpauth://totp/Test:${email}?secret=${secret}`;
  }

  verifier(code: string): boolean {
    return code === CODE_TOTP_VALIDE;
  }
}
