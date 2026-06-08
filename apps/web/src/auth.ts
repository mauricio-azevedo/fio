export interface AuthSession {
  accessToken: string;
  expiresAt: number;
}

export interface AuthClientConfig {
  issuer: string;
  clientId: string;
  redirectUri: string;
}

const verifierStorageKey = 'fio.oidc.codeVerifier';
const stateStorageKey = 'fio.oidc.state';
const sessionStorageKey = 'fio.oidc.session';

export function readStoredSession(now = Date.now()): AuthSession | null {
  const rawSession = window.sessionStorage.getItem(sessionStorageKey);

  if (rawSession === null) {
    return null;
  }

  const parsedSession = parseSession(rawSession);

  if (parsedSession === null || parsedSession.expiresAt <= now) {
    clearStoredSession();
    return null;
  }

  return parsedSession;
}

export function clearStoredSession(): void {
  window.sessionStorage.removeItem(sessionStorageKey);
  window.sessionStorage.removeItem(verifierStorageKey);
  window.sessionStorage.removeItem(stateStorageKey);
}

export async function startSignIn(config: AuthClientConfig): Promise<void> {
  const codeVerifier = createRandomString(64);
  const state = createRandomString(32);
  const codeChallenge = await createCodeChallenge(codeVerifier);

  window.sessionStorage.setItem(verifierStorageKey, codeVerifier);
  window.sessionStorage.setItem(stateStorageKey, state);

  const authorizationUrl = new URL(`${config.issuer}/protocol/openid-connect/auth`);
  authorizationUrl.searchParams.set('client_id', config.clientId);
  authorizationUrl.searchParams.set('redirect_uri', config.redirectUri);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', 'openid email profile');
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('code_challenge', codeChallenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');

  window.location.assign(authorizationUrl.toString());
}

export async function completeSignInFromUrl(config: AuthClientConfig): Promise<AuthSession | null> {
  const currentUrl = new URL(window.location.href);
  const code = currentUrl.searchParams.get('code');
  const state = currentUrl.searchParams.get('state');

  if (code === null && state === null) {
    return null;
  }

  if (code === null || state === null) {
    clearStoredSession();
    throw new Error('Invalid sign-in callback.');
  }

  const expectedState = window.sessionStorage.getItem(stateStorageKey);
  const codeVerifier = window.sessionStorage.getItem(verifierStorageKey);

  if (expectedState === null || codeVerifier === null || state !== expectedState) {
    clearStoredSession();
    throw new Error('Sign-in callback state did not match.');
  }

  const response = await fetch(`${config.issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    clearStoredSession();
    throw new Error('Failed to complete sign-in.');
  }

  const tokenResponse = parseTokenResponse(await response.json());
  const session: AuthSession = {
    accessToken: tokenResponse.accessToken,
    expiresAt: Date.now() + tokenResponse.expiresIn * 1000,
  };

  window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
  window.sessionStorage.removeItem(verifierStorageKey);
  window.sessionStorage.removeItem(stateStorageKey);
  window.history.replaceState({}, document.title, currentUrl.pathname);

  return session;
}

interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

function parseTokenResponse(value: unknown): TokenResponse {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid token response.');
  }

  const record = value as Record<string, unknown>;
  const accessToken = record['access_token'];
  const expiresIn = record['expires_in'];

  if (typeof accessToken !== 'string' || typeof expiresIn !== 'number') {
    throw new Error('Invalid token response.');
  }

  return { accessToken, expiresIn };
}

function parseSession(value: string): AuthSession | null {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const accessToken = record['accessToken'];
    const expiresAt = record['expiresAt'];

    if (typeof accessToken !== 'string' || typeof expiresAt !== 'number') {
      return null;
    }

    return { accessToken, expiresAt };
  } catch {
    return null;
  }
}

function createRandomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  window.crypto.getRandomValues(bytes);

  return base64UrlEncode(bytes);
}

async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));

  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return window.btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
