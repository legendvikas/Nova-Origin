const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SESSION_KEY = 'nova-origin-session';

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
  const url = new URL(\`\${SUPABASE_URL}/rest/v1/\${table}\`);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  const session = getSession();
  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: \`Bearer \${options.token || session?.access_token || SUPABASE_KEY}\`,
      'Content-Type': 'application/json',
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || \`Request failed (\${response.status})\`);
  return (text ? JSON.parse(text) : null) as T;
}

export async function currentUser(token: string): Promise<NovaUser> {
  const response = await fetch(\`\${SUPABASE_URL}/auth/v1/user\`, {
    headers: { apikey: SUPABASE_KEY, Authorization: \`Bearer \${token}\` },
  });
  if (!response.ok) throw new Error('Your sign-in session is no longer valid.');
  return response.json();
}

export function signInWithGoogle() {
  if (!hasSupabaseConfig()) throw new Error('Supabase environment variables are missing.');
  const redirect = encodeURIComponent(window.location.origin);
  window.location.href = \`\${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=\${redirect}\`;
}

export function signOut() { clearSession(); window.location.assign('/'); }

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
