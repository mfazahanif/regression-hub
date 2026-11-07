type StoredAuth = {
  access_token?: string;
  refresh_token?: string;
  [key: string]: unknown;
};

let refreshInFlight: Promise<StoredAuth | null> | null = null;

function readAuth(): StoredAuth {
  try {
    return JSON.parse(localStorage.getItem('auth') || '{}');
  } catch {
    return {};
  }
}

async function refreshAuth(apiUrl: string, expectedRefreshToken: string): Promise<StoredAuth | null> {
  const latestAuth = readAuth();
  if (latestAuth.refresh_token !== expectedRefreshToken) {
    return latestAuth.access_token ? latestAuth : null;
  }

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: expectedRefreshToken }),
    })
      .then(async response => {
        if (!response.ok) return null;
        const result = await response.json();
        const currentAuth = readAuth();
        if (currentAuth.refresh_token !== expectedRefreshToken) return currentAuth;

        const updatedAuth = { ...currentAuth, ...result.data };
        localStorage.setItem('auth', JSON.stringify(updatedAuth));
        document.cookie = `coreqa_token=${updatedAuth.access_token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=strict`;
        return updatedAuth;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

export async function refreshCurrentSession(apiUrl: string): Promise<StoredAuth | null> {
  const auth = readAuth();
  if (!auth.refresh_token) return null;
  return refreshAuth(apiUrl, auth.refresh_token);
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
): Promise<Response> {
  const auth = readAuth();
  const headers = new Headers(init.headers);
  if (auth.access_token) headers.set('Authorization', `Bearer ${auth.access_token}`);

  const response = await fetch(input, { ...init, headers });
  if (response.status !== 401 || !auth.refresh_token) return response;

  const currentAuth = readAuth();
  const renewedAuth = currentAuth.access_token !== auth.access_token
    ? currentAuth
    : await refreshAuth(apiUrl, auth.refresh_token).catch(() => undefined);

  if (renewedAuth === undefined) return response;

  if (!renewedAuth?.access_token) {
    localStorage.removeItem('auth');
    document.cookie = 'coreqa_token=; path=/; max-age=0; samesite=strict';
    window.location.assign(new URL('/login', window.location.origin));
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${renewedAuth.access_token}`);
  return fetch(input, { ...init, headers: retryHeaders });
}
