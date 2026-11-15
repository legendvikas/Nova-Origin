import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { HomeDashboard } from './components/HomeDashboard';
import { PublicPage } from './components/PublicPage';
import { api, clearSession, currentUser, getSession, loadPublicData, NovaUser, saveSession, signInWithPassword, signOut } from './lib/supabase';
import './index.css';

type PublicData = Awaited<ReturnType<typeof loadPublicData>>;
const isAdminPath = (path: string) => ['/nova-origin-admin','/nova-origin-admin/','/control-room','/control-room/','/admin','/admin/'].includes(path);
const publicPages = ['about','players','teams','events','news','partners','join','contact'];
const getPage = (path: string) => publicPages.includes(path.replace(/^\/+|\/+$/g,'')) ? path.replace(/^\/+|\/+$/g,'') : 'home';

function App() {
  const [data, setData] = useState<PublicData>({ games: [], tournaments: [], teams: [], announcements: [], posts: [], players: [] });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<NovaUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [organizerStatus, setOrganizerStatus] = useState<string | null>(null);
  const [route, setRoute] = useState(() => isAdminPath(window.location.pathname) ? 'admin' : getPage(window.location.pathname));
  const [authError, setAuthError] = useState('');

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setRoute(isAdminPath(path) ? 'admin' : getPage(path));
    window.scrollTo({top:0,behavior:'smooth'});
  };

  useEffect(() => {
    const onPopState = () => setRoute(isAdminPath(window.location.pathname) ? 'admin' : getPage(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => { document.title = route === 'admin' ? 'NOVA ORIGIN Admin' : route === 'home' ? 'NOVA ORIGIN ESPORTS' : `${route.toUpperCase()} | NOVA ORIGIN ESPORTS`; }, [route]);

  const refresh = async () => { setLoading(true); try { setData(await loadPublicData()); } finally { setLoading(false); } };

  useEffect(() => {
    const boot = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hash.get('access_token');
      if (accessToken) {
        saveSession({ access_token: accessToken, refresh_token: hash.get('refresh_token') || undefined, expires_at: Number(hash.get('expires_at') || 0) || undefined });
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
      const session = getSession();
      if (session?.access_token) {
        try {
          const signedInUser = await currentUser(session.access_token);
          setUser(signedInUser);
          const [roles, organizers] = await Promise.all([
            api<any[]>('user_roles', { select: 'role', user_id: `eq.${signedInUser.id}` }).catch(() => []),
            api<any[]>('organizers', { select: 'status', user_id: `eq.${signedInUser.id}` }).catch(() => []),
          ]);
          setRole(roles[0]?.role || null); setOrganizerStatus(organizers[0]?.status || null);
        } catch { signOut(); }
      }
      await refresh();
    };
    boot();
  }, []);

  const handleEmailLogin = async (email: string, password: string) => {
    setAuthError('');
    try {
      const session = await signInWithPassword(email, password);
      const signedInUser = await currentUser(session.access_token);
      setUser(signedInUser);
      const [roles, organizers] = await Promise.all([
        api<any[]>('user_roles', { select: 'role', user_id: `eq.${signedInUser.id}` }).catch(() => []),
        api<any[]>('organizers', { select: 'status', user_id: `eq.${signedInUser.id}` }).catch(() => []),
      ]);
      setRole(roles[0]?.role || null); setOrganizerStatus(organizers[0]?.status || null);
    } catch (e: any) { clearSession(); setAuthError(e.message || 'Unable to sign in.'); throw e; }
  };

  const canManage = role === 'super_admin' || role === 'platform_admin' || (role === 'organizer' && organizerStatus === 'approved');
  if (route === 'admin') return <Dashboard user={user} role={role} organizerStatus={organizerStatus}
    onBack={() => navigate('/')} onLogin={handleEmailLogin}
    onLogout={() => { signOut(); setUser(null); setRole(null); }}
    authError={authError} canManage={canManage} onRefresh={refresh} />;
  if (route !== 'home') return <PublicPage page={route} data={data} loading={loading} onNavigate={navigate}/>;
  return <HomeDashboard data={data} loading={loading}/>;
}
export default App;
