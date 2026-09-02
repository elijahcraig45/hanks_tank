/**
 * Google sign-in, via Google Identity Services.
 *
 * The browser gets an ID token — a JWT Google signed — and every authenticated request
 * carries it as a bearer token for the server to verify. There is no session cookie:
 * the token already carries an identity and an expiry, so a second credential to keep
 * in sync would be more to go wrong, not less.
 *
 * ID tokens last about an hour. Rather than refresh them on a timer, this stores the
 * expiry and re-prompts when it has passed — silently where Google can, because the
 * user is still signed in to Google itself.
 *
 * The client ID comes from the server (/api/pickem/config) rather than a build-time
 * env var, so the browser and the server that verifies the token can never disagree
 * about which app is asking.
 */

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const STORAGE_KEY = 'ht.pickem.auth.v1';

let gsiLoad = null;
let session = null;             // { token, expiresAt, profile }
const listeners = new Set();

/** localStorage is unavailable in some privacy modes; a signed-out session is fine. */
function canStore() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function persist() {
  if (!canStore()) return;
  try {
    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Full or blocked storage is not worth failing a sign-in over.
  }
}

function restore() {
  if (session !== null || !canStore()) return session;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // An expired token is worse than none: it would produce 401s that look like a bug.
    if (!parsed?.token || !parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    session = parsed;
    return session;
  } catch {
    return null;
  }
}

function emit() {
  for (const fn of listeners) {
    try { fn(getSession()); } catch { /* a bad listener must not break sign-in */ }
  }
}

export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The current session, or null. Expiry is checked on every read. */
export function getSession() {
  const s = session || restore();
  if (s && s.expiresAt <= Date.now()) {
    session = null;
    persist();
    return null;
  }
  return s;
}

export function getToken() {
  return getSession()?.token ?? null;
}

export function getProfile() {
  return getSession()?.profile ?? null;
}

export function signOut() {
  session = null;
  persist();
  try {
    window.google?.accounts?.id?.disableAutoSelect?.();
  } catch { /* the library may not be loaded */ }
  emit();
}

/** Load the GSI script once. */
function loadGsi() {
  if (gsiLoad) return gsiLoad;
  gsiLoad = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    const script = existing || document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Could not load Google sign-in.'));
    if (!existing) document.head.appendChild(script);
  });
  return gsiLoad;
}

function acceptCredential(response) {
  const token = response?.credential;
  if (!token) return null;
  const claims = decodeJwt(token);
  if (!claims?.sub) return null;

  session = {
    token,
    // Google's own expiry, not a guess. Trimmed by a minute so a request started just
    // before the boundary does not arrive just after it.
    expiresAt: (claims.exp * 1000) - 60_000,
    profile: {
      userId: claims.sub,
      email: claims.email ?? null,
      name: claims.name ?? claims.given_name ?? null,
      picture: claims.picture ?? null,
    },
  };
  persist();
  emit();
  return session;
}

/**
 * Initialise GSI and render a sign-in button into `element`.
 *
 * Rendering Google's own button rather than a custom one is deliberate: it is the only
 * way to get the One Tap and account-chooser behaviour, and a hand-rolled button that
 * calls `prompt()` is blocked as a popup in several browsers.
 */
export async function mountSignIn(element, clientId, { onSignIn } = {}) {
  if (!clientId) throw new Error('Google sign-in is not configured on the server.');
  const google = await loadGsi();

  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      const next = acceptCredential(response);
      if (next && onSignIn) onSignIn(next);
    },
    auto_select: true,
    cancel_on_tap_outside: true,
  });

  if (element) {
    google.accounts.id.renderButton(element, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      logo_alignment: 'left',
    });
  }

  // Only offered when nobody is signed in, so a returning visitor is not nagged.
  if (!getSession()) {
    try { google.accounts.id.prompt(); } catch { /* One Tap is best-effort */ }
  }
  return google;
}
