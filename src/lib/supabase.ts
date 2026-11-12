const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SESSION_KEY = 'nova-origin-session';

export type NovaSession = { access_token: string; refresh_token?: string; expires_at?: number };
export type NovaUser = { id: string; email?: string; user_metadata?: { full_name?: string; name?: string; avatar_url?: string } };

export function hasSupabaseConfig() { return Boolean(SUPABASE_URL && SUPABASE_KEY); }
export function getSession(): NovaSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
export function saveSession(session: NovaSession) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); window.dispatchEvent(new Event('nova-auth-changed')); }
export function clearSession() { localStorage.removeItem(SESSION_KEY); window.dispatchEvent(new Event('nova-auth-changed')); }

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

async function authRequest(path: string, body: Record<string, unknown>) {
  if (!hasSupabaseConfig()) throw new Error('Supabase environment variables are missing.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.message || payload.error_description || payload.error || 'Authentication request failed.');
  return payload;
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const payload = await authRequest('signup?redirect_to=' + encodeURIComponent(window.location.origin), {
    email: email.trim().toLowerCase(), password, data: { full_name: fullName.trim() },
  });
  if (payload.access_token) {
    saveSession({ access_token: payload.access_token, refresh_token: payload.refresh_token, expires_at: Math.floor(Date.now()/1000) + Number(payload.expires_in || 3600) });
  }
  return payload;
}

export async function signInWithEmail(email: string, password: string) {
  const payload = await authRequest('token?grant_type=password', { email: email.trim().toLowerCase(), password });
  saveSession({ access_token: payload.access_token, refresh_token: payload.refresh_token, expires_at: Math.floor(Date.now()/1000) + Number(payload.expires_in || 3600) });
  return payload;
}

export async function getValidSession(): Promise<NovaSession | null> {
  const session = getSession();
  if (!session?.access_token) return null;
  if (!session.expires_at || session.expires_at > Math.floor(Date.now()/1000) + 60) return session;
  if (!session.refresh_token) { clearSession(); return null; }
  try {
    const payload = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    const next = { access_token: payload.access_token, refresh_token: payload.refresh_token || session.refresh_token, expires_at: Math.floor(Date.now()/1000) + Number(payload.expires_in || 3600) };
    saveSession(next);
    return next;
  } catch { clearSession(); return null; }
}

export async function uploadPlayerAvatar(file: File, userId: string): Promise<string> {
  if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('Choose a JPG, PNG, WEBP or GIF image under 5 MB.');
  }
  const session = await getValidSession();
  if (!session?.access_token) throw new Error('Please sign in again before uploading your photo.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '').slice(-80) || 'avatar';
  const path = 'players/' + userId + '/' + Date.now() + '-' + safeName;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/nova-media/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': file.type,
      'x-upsert': 'false',
    },
    body: file,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Profile photo upload failed.');
  }
  return `${SUPABASE_URL}/storage/v1/object/public/nova-media/${path}`;
}

export async function uploadTeamLogo(file: File, userId: string): Promise<string> {
  if (!hasSupabaseConfig()) throw new Error('Supabase is not configured.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
    throw new Error('Choose a JPG, PNG or WEBP team icon under 3 MB.');
  }
  const session = await getValidSession();
  if (!session?.access_token) throw new Error('Please sign in again before uploading your team icon.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '').slice(-80) || 'team-logo';
  const path = 'teams/' + userId + '/' + Date.now() + '-' + safeName;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/nova-media/${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': file.type, 'x-upsert': 'false' },
    body: file,
  });
  if (!response.ok) throw new Error((await response.text()) || 'Team icon upload failed.');
  return `${SUPABASE_URL}/storage/v1/object/public/nova-media/${path}`;
}

export async function currentUser(token: string): Promise<NovaUser> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Your sign-in session is no longer valid.');
  return response.json();
}

export function signInWithGoogle() {
  if (!hasSupabaseConfig()) throw new Error('Supabase environment variables are missing.');
  const redirect = encodeURIComponent(window.location.origin);
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirect}`;
}

export function signOut() { clearSession(); window.location.assign('/'); }

export async function loadPublicData() {
  const read = async (table: string, query: Record<string, string>) => {
    try { return await api<any[]>(table, query); } catch { return []; }
  };
  const [games, tournaments, teams, announcements, posts] = await Promise.all([
    read('games', { select: 'id,name,slug,publisher,is_active', is_active: 'eq.true', order: 'name.asc' }),
    read('tournaments', { select: 'id,title,slug,summary,description,banner_url,format,team_size,max_entries,entry_type,status,registration_opens_at,registration_closes_at,starts_at,ends_at,prize_description,game_id,game:games(name),game_mode:game_modes(name)', status: 'in.(published,registration_open,registration_closed,live,completed)', order: 'starts_at.asc.nullslast', limit: '12' }),
    read('teams', { select: 'id,name,team_tag,description,logo_url,owner_id,is_verified,verified_at,game_id,game:games(name)', is_public: 'eq.true', status: 'eq.active', order: 'created_at.desc', limit: '8' }),
    read('announcements', { select: 'id,title,body,audience,published_at,created_at', status: 'eq.published', order: 'published_at.desc.nullslast', limit: '4' }),
    read('social_posts', { select: 'id,content,media_url,media_type,created_at', is_published: 'eq.true', order: 'created_at.desc', limit: '3' }),
  ]);
  return { games, tournaments, teams, announcements, posts };
}
