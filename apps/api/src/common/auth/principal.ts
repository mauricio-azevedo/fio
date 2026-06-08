export interface AuthenticatedPrincipal {
  subject: string;
  email: string | null;
  displayName: string | null;
}
