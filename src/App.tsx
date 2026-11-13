import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Menu, X, Shield, Trophy, Users, Gamepad2, Zap, ChevronRight, Radio, CalendarDays, Swords, Instagram, Youtube, Disc3, LogIn, Settings2 } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { HomeDashboard } from './components/HomeDashboard';
import { api, currentUser, getSession, hasSupabaseConfig, loadPublicData, NovaUser, saveSession, signInWithGoogle, signOut } from './lib/supabase';
import './index.css';

type PublicData = Awaited<ReturnType<typeof loadPublicData>>;

function App() {
  const [data, setData] = useState<PublicData>({ games: [], tournaments: [], teams: [], announcements: [], posts: [] });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<NovaUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [organizerStatus, setOrganizerStatus] = useState<string | null>(null);
  const [page, setPage] = useState<'home' | 'admin'>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [authError, setAuthError] = useState('');

  const refresh = async () => {
    setLoading(true);
    try { setData(await loadPublicData()); } finally { setLoading(false); }
  };

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
            api<any[]>('user_roles', { select: 'role', user_id: \`eq.\${signedInUser.id}\` }).catch(() => []),
            api<any[]>('organizers', { select: 'status', user_id: \`eq.\${signedInUser.id}\` }).catch(() => []),
          ]);
          setRole(roles[0]?.role || null);
          setOrganizerStatus(organizers[0]?.status || null);
        } catch { signOut(); }
      }
      await refresh();
    };
    boot();
  }, []);

  const canManage = role === 'super_admin' || role === 'platform_admin' || (role === 'organizer' && organizerStatus === 'approved');
  const openAdmin = () => { setPage('admin'); setMenuOpen(false); };

  if (page === 'admin') {
    return (
      <Dashboard
        user={user}
        role={role}
        organizerStatus={organizerStatus}
        onBack={() => setPage('home')}
        onLogin={async () => { setAuthError(''); try { signInWithGoogle(); } catch (e: any) { setAuthError(e.message); } }}
        onLogout={() => { signOut(); setUser(null); setRole(null); }}
        authError={authError}
        canManage={canManage}
        onRefresh={refresh}
      />
    );
  }

  return <HomeDashboard data={data} loading={loading} onAdmin={openAdmin} />;
}
export default App;
