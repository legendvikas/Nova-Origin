import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Menu, X, Shield, Trophy, Users, Gamepad2, Zap, ChevronRight, Radio, CalendarDays, Swords, Instagram, Youtube, Disc3, LogIn, Settings2 } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { api, currentUser, getSession, hasSupabaseConfig, loadPublicData, NovaUser, saveSession, signInWithGoogle, signOut } from './lib/supabase';
import './index.css';

type PublicData = Awaited<ReturnType<typeof loadPublicData>>;

function App() {
  const [data, setData] = useState<PublicData>({ games: [], tournaments: [], teams: [], announcements: [], posts: [] });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<NovaUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [organizerStatus, setOrganizerStatus] = useState<string | null>(null);
  const [page, setPage] = useState<'home' | 'admin'>(() => window.location.hostname.startsWith('nova-origin-admin') || window.location.pathname.startsWith('/admin') ? 'admin' : 'home');
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
            api<any[]>('user_roles', { select: 'role', user_id: `eq.${signedInUser.id}` }).catch(() => []),
            api<any[]>('organizers', { select: 'status', user_id: `eq.${signedInUser.id}` }).catch(() => []),
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

  return (
    <div className="site-shell">
      <div className="topline"><span className="live-dot" /> NOVA ORIGIN <span className="topline-divider">/</span> BUILT FOR THE NEXT LEVEL <span className="topline-right">INDIA · ESPORTS</span></div>
      <header className="site-header">
        <a className="brand" href="#home" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="brand-mark"><span>N</span><i /></span>
          <span className="brand-copy"><b>NOVA</b><small>ORIGIN</small></span>
        </a>
        <nav className={menuOpen ? 'main-nav open' : 'main-nav'}>
          <a href="#games" onClick={() => setMenuOpen(false)}>Games</a>
          <a href="#roster" onClick={() => setMenuOpen(false)}>Roster</a>
          <a href="#tournaments" onClick={() => setMenuOpen(false)}>Tournaments</a>
          <a href="#updates" onClick={() => setMenuOpen(false)}>Updates</a>
          <button className="nav-mobile-admin" onClick={openAdmin}>Control room <ArrowUpRight size={15}/></button>
        </nav>
        <div className="header-actions">
          <span className="header-badge"><span className="live-dot" /> OPEN TO COMPETE</span>
          <button className="admin-link" onClick={openAdmin}>Control room <ArrowUpRight size={15}/></button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X/> : <Menu/>}</button>
        </div>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-line"/> THE NEXT WAVE OF COMPETITION <span className="eyebrow-line"/></div>
            <h1>BUILT TO<br/><em>RISE.</em> READY<br/>TO <span className="outline-word">DOMINATE.</span></h1>
            <p className="hero-description">More than a team. A collective of players, creators and competitors building something that lasts.</p>
            <div className="hero-cta">
              <a className="button-primary" href="#roster">MEET THE ROSTER <ArrowUpRight size={17}/></a>
              <a className="button-ghost" href="#tournaments">EXPLORE EVENTS <ArrowRight size={16}/></a>
            </div>
            <div className="hero-meta"><span><i className="live-dot"/> ACTIVE COMMUNITY</span><span>EST. 2024</span><span>INDIA / GLOBAL</span></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-ring ring-a"/><div className="hero-ring ring-b"/><div className="hero-ring ring-c"/>
            <div className="hero-symbol">N<span>✳</span></div>
            <div className="hero-coordinate">26°50' N<br/>80°56' E</div>
            <div className="hero-side-label">NOVA / ORIGIN / 001</div>
            <div className="hero-index">01 — 04</div>
          </div>
          <div className="hero-bottom"><span>SCROLL TO EXPLORE</span><span className="scroll-line"/></div>
        </section>

        <section className="stat-strip">
          <div><b>{data.teams.length.toString().padStart(2, '0')}</b><span>ACTIVE TEAMS</span></div>
          <div><b>{data.tournaments.length.toString().padStart(2, '0')}</b><span>LIVE EVENTS</span></div>
          <div><b>{data.games.length.toString().padStart(2, '0')}</b><span>GAME TITLES</span></div>
          <div className="stat-note"><span className="live-dot"/> REAL COMPETITION. REAL COMMUNITY.</div>
        </section>

        <section className="section games-section" id="games">
          <div className="section-head"><div><div className="section-kicker">01 / OUR ARENA</div><h2>THE GAMES<br/><em>WE PLAY.</em></h2></div><p>Different battlegrounds.<br/>One standard: excellence.</p></div>
          <div className="game-grid">
            {data.games.map((game: any, i: number) => <article className="game-card" key={game.id}>
              <div className={'game-art game-art-' + i}><Gamepad2 size={35}/><span>0{i + 1}</span></div>
              <div className="game-card-foot"><div><h3>{game.name}</h3><small>{game.publisher || 'COMPETITIVE TITLE'}</small></div><ArrowUpRight size={19}/></div>
            </article>)}
            {!loading && data.games.length === 0 && <div className="empty-state">Game titles will appear here once added in the control room.</div>}
          </div>
        </section>

        <section className="roster-section" id="roster">
          <div className="section roster-inner">
            <div className="section-head"><div><div className="section-kicker">02 / THE COLLECTIVE</div><h2>ONE NAME.<br/><em>MANY LEGENDS.</em></h2></div><p>Every role matters. Every player<br/>moves the team forward.</p></div>
            <div className="roster-list">
              {data.teams.map((team: any, i: number) => <article className="roster-row" key={team.id}>
                <span className="roster-number">0{i + 1}</span>
                <div className="roster-emblem">{team.logo_url ? <img src={team.logo_url} alt=""/> : <span>{team.team_tag?.slice(0, 3) || 'N'}</span>}</div>
                <div className="roster-info"><h3>{team.name}</h3><p>{team.description || team.game?.name || 'NOVA ORIGIN TEAM'}</p></div>
                <span className="roster-game">{team.game?.name || 'COMPETITIVE'}</span><span className="roster-tag">[{team.team_tag}]</span><ArrowUpRight className="roster-arrow"/>
              </article>)}
              {!loading && data.teams.length === 0 && <div className="empty-state">The roster is getting ready. Team profiles will appear here soon.</div>}
            </div>
          </div>
        </section>

        <section className="section tournament-section" id="tournaments">
          <div className="section-head"><div><div className="section-kicker">03 / THE CIRCUIT</div><h2>BUILT FOR<br/><em>BIG MOMENTS.</em></h2></div><p>Follow the action, find your next<br/>challenge and stay in the loop.</p></div>
          <div className="event-grid">
            {data.tournaments.map((event: any) => <article className="event-card" key={event.id}>
              <div className="event-visual" style={event.banner_url ? { backgroundImage: `linear-gradient(180deg, transparent, #111), url(${event.banner_url})` } : undefined}><span className="event-status"><i className="live-dot"/>{event.status.replaceAll('_', ' ')}</span><Trophy size={42}/><span className="event-format">{event.format?.replaceAll('_', ' ')}</span></div>
              <div className="event-body"><small>{event.game?.name || 'NOVA COMPETITION'}</small><h3>{event.title}</h3><p>{event.summary || 'Competition starts here.'}</p><div className="event-foot"><span>{event.starts_at ? new Date(event.starts_at).toLocaleDateString() : 'DATE TO BE ANNOUNCED'}</span><span>{event.team_size} PLAYER FORMAT</span></div></div>
            </article>)}
            {!loading && data.tournaments.length === 0 && <div className="empty-state event-empty"><CalendarDays size={26}/><b>THE NEXT EVENT IS LOADING.</b><span>New tournaments will be announced here.</span></div>}
          </div>
        </section>

        <section className="updates-section" id="updates"><div className="section updates-inner">
          <div className="section-head"><div><div className="section-kicker">04 / TRANSMISSIONS</div><h2>STAY IN<br/><em>THE KNOW.</em></h2></div><p>Announcements and stories<br/>from the NOVA universe.</p></div>
          <div className="updates-grid">
            {data.announcements.map((item: any) => <article className="update-card" key={item.id}><span className="update-type">ANNOUNCEMENT</span><h3>{item.title}</h3><p>{item.body}</p><small>{item.published_at ? new Date(item.published_at).toLocaleDateString() : 'NOVA ORIGIN'}</small></article>)}
            {data.posts.map((item: any) => <article className="update-card" key={item.id}><span className="update-type">COMMUNITY UPDATE</span><h3>{item.content.slice(0, 56)}{item.content.length > 56 ? '…' : ''}</h3><p>{item.content}</p><small>{new Date(item.created_at).toLocaleDateString()}</small></article>)}
            {!loading && data.announcements.length + data.posts.length === 0 && <div className="empty-state">No transmissions yet. Check back for the latest NOVA updates.</div>}
          </div>
        </div></section>

        <section className="join-section"><div className="join-glow"/><div className="section-kicker">YOUR NEXT CHAPTER STARTS HERE</div><h2>FIND YOUR<br/><em>ORIGIN.</em></h2><p>Ready to compete, collaborate or create with us?</p><a className="button-primary" href="mailto:hello@novaorigin.gg">CONNECT WITH NOVA <ArrowUpRight size={17}/></a></section>
      </main>

      <footer className="site-footer"><a className="brand" href="#home"><span className="brand-mark"><span>N</span><i/></span><span className="brand-copy"><b>NOVA</b><small>ORIGIN</small></span></a><span className="footer-copy">© 2026 NOVA ORIGIN. ALL SYSTEMS NOMINAL.</span><div className="footer-social"><a href="#" aria-label="Instagram"><Instagram size={17}/></a><a href="#" aria-label="YouTube"><Youtube size={17}/></a><a href="#" aria-label="Community"><Disc3 size={17}/></a></div><button className="footer-admin" onClick={openAdmin}><Settings2 size={15}/> ADMIN ACCESS</button></footer>
    </div>
  );
}
export default App;
