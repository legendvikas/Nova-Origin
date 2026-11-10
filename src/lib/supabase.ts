const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SESSION_KEY = 'nova-origin-session';
const PKCE_KEY = 'nova-origin-pkce-verifier';

export type NovaSession = { access_token: string; refresh_token?: string; expires_at?: number };
export type NovaUser = { id: string; email?: string; user_metadata?: { full_name?: string; name?: string; avatar_url?: string } };

export function hasSupabaseConfig() { return Boolean(SUPABASE_URL && SUPABASE_KEY); }
export function getSession(): NovaSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
export function saveSession(session: NovaSession) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
export function clearSession() { localStorage.removeItem(SESSION_KEY); }

export async function api<T = any>(table: string, query: Record<string, string> = {}, options: { method?: string; body?: unknown; token?: string; prefer?: string } = {}): Promise<T> {
  if (!hasSupabaseConfig()) throw new Error('Supabase is not configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables.');
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  const session = getSession();
  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${options.token || session?.access_token || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Request failed (${response.status})`);
  return (text ? JSON.parse(text) : null) as T;
}


export async function createPlayerAccount(input: { email: string; username: string; display_name: string; bio?: string; country_code?: string }) {
  if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');
  const session = getSession();
  if (!session?.access_token) throw new Error('Sign in again before creating a player.');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-player`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Player account could not be created.');
  return body as { ok: boolean; username: string; email: string; message: string };
}

export function mediaPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/nova-media/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export async function uploadMediaFile(file: File, path: string) {
  if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');
  const session = getSession();
  if (!session?.access_token) throw new Error('Sign in again before uploading.');
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/nova-media/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': file.type, 'x-upsert': 'false' },
    body: file,
  });
  const body = await response.text();
  if (!response.ok) throw new Error(body || `Upload failed (${response.status})`);
  return path;
}

export async function deleteMediaFile(path: string) {
  if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');
  const session = getSession();
  if (!session?.access_token) throw new Error('Sign in again before deleting.');
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/nova-media`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [path] }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(body || `Delete failed (${response.status})`);
}

export async function currentUser(token: string): Promise<NovaUser> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Your sign-in session is no longer valid.');
  return response.json();
}

async function createPkcePair() {
  const bytes = crypto.getRandomValues(new Uint8Array( verifierLength ));
  const verifier = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  localStorage.setItem(PKCE_KEY, verifier);
  return challenge;
}
const verifierLength = 32;

export async function signInWithGoogle() {
  if (!hasSupabaseConfig()) throw new Error('Supabase environment variables are missing.');
  const challenge = await createPkcePair();
  const params = new URLSearchParams({ provider: 'google', redirect_to: window.location.origin, code_challenge: challenge, code_challenge_method: 's256' });
  window.location.assign(`${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`);
}

export async function sendAdminLoginLink(email: string) {
  if (!hasSupabaseConfig()) throw new Error('Supabase environment variables are missing.');
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Valid email address enter karo.');
  const challenge = await createPkcePair();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/otp?redirect_to=${encodeURIComponent(window.location.origin)}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail, create_user: false, gotrue_meta_security: {}, code_challenge: challenge, code_challenge_method: 's256' }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    localStorage.removeItem(PKCE_KEY);
    throw new Error(body.msg || body.message || body.error_description || 'Login link send nahi hua. Supabase Email Auth configuration check karo.');
  }
}

export async function completeAuthCallback() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const hashError = hash.get('error_description') || hash.get('error');
  if (hashError) throw new Error(decodeURIComponent(hashError.replace(/\+/g, ' ')));
  const code = url.searchParams.get('code');
  if (code) {
    const verifier = localStorage.getItem(PKCE_KEY);
    if (!verifier) throw new Error('Login callback verifier missing. Login dobara start karo.');
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.msg || body.message || body.error_description || 'Login code exchange failed.');
    saveSession({ access_token: body.access_token, refresh_token: body.refresh_token, expires_at: body.expires_at || (Math.floor(Date.now()/1000) + (body.expires_in || 3600)) });
    localStorage.removeItem(PKCE_KEY);
    window.history.replaceState({}, document.title, url.pathname + url.search.replace(/([?&])code=[^&]+&?/, '$1').replace(/[?&]$/, ''));
    return;
  }
  const accessToken = hash.get('access_token');
  if (accessToken) {
    saveSession({ access_token: accessToken, refresh_token: hash.get('refresh_token') || undefined, expires_at: Number(hash.get('expires_at') || 0) || undefined });
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }
}

export async function refreshAuthSession() {
  const session = getSession();
  if (!session?.refresh_token || !session.expires_at || session.expires_at > Math.floor(Date.now()/1000) + 60) return session;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) { clearSession(); throw new Error(body.msg || 'Session expired. Please sign in again.'); }
  const next = { access_token: body.access_token, refresh_token: body.refresh_token, expires_at: body.expires_at || (Math.floor(Date.now()/1000)+(body.expires_in||3600)) };
  saveSession(next); return next;
}

export function signOut() { clearSession(); localStorage.removeItem(PKCE_KEY); window.location.assign('/'); }

export async function loadPublicData() {
  const read = async (table: string, query: Record<string, string>) => {
    try { return await api<any[]>(table, query); } catch { return []; }
  };
  const [games, tournaments, teams, announcements, posts] = await Promise.all([
    read('games', { select: 'id,name,slug,publisher,is_active', is_active: 'eq.true', order: 'name.asc' }),
    read('tournaments', { select: 'id,title,slug,summary,banner_url,format,team_size,max_entries,status,starts_at,prize_description,game:games(name)', status: 'in.(published,registration_open,registration_closed,live)', order: 'starts_at.asc.nullslast', limit: '6' }),
    read('teams', { select: 'id,name,team_tag,description,logo_url,game_id,game:games(name)', is_public: 'eq.true', status: 'eq.active', order: 'created_at.desc', limit: '8' }),
    read('announcements', { select: 'id,title,body,audience,published_at,created_at', status: 'eq.published', order: 'published_at.desc.nullslast', limit: '4' }),
    read('social_posts', { select: 'id,content,media_url,media_type,created_at', is_published: 'eq.true', order: 'created_at.desc', limit: '3' }),
  ]);
  return { games, tournaments, teams, announcements, posts };
}


export async function signInWithPassword(email: string, password: string) {
  if (!hasSupabaseConfig()) throw new Error('Supabase environment variables are missing.');
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) throw new Error('Email aur password dono enter karo.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail, password }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.msg || body.message || body.error_description || 'Email ya password galat hai.');
  saveSession({ access_token: body.access_token, refresh_token: body.refresh_token, expires_at: body.expires_at || (Math.floor(Date.now()/1000) + (body.expires_in || 3600)) });
  return currentUser(body.access_token);
}
