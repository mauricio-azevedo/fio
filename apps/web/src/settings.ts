export interface BrowserSettings {
  apiBaseUrl: string;
  oidcClientId: string;
  oidcIssuer: string;
}

const env = import.meta.env as Record<string, string | undefined>;

export const browserSettings: BrowserSettings = {
  apiBaseUrl: requireSetting('VITE_API_BASE_URL'),
  oidcClientId: requireSetting('VITE_OIDC_CLIENT_ID'),
  oidcIssuer: requireSetting('VITE_KEYCLOAK_ISSUER'),
};

function requireSetting(name: string): string {
  const value = env[name];

  if (value === undefined || value.length === 0) {
    throw new Error(`Missing browser setting: ${name}`);
  }

  return value;
}
