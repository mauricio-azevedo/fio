export interface BrowserSettings {
  apiBaseUrl: string;
  oidcClientId: string;
  oidcIssuer: string;
}

export const browserSettings: BrowserSettings = {
  apiBaseUrl: 'http://localhost:3000/v1',
  oidcClientId: 'fio-web',
  oidcIssuer: 'http://localhost:8080/realms/fio',
};
