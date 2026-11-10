import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import {
  ArrowRight, ArrowUpRight, Menu, X, Gamepad2, Trophy, Users, CalendarDays,
  Radio, Instagram, Youtube, Disc3, ChevronRight, MapPin, Clock3, Shield,
  Swords, Newspaper, Mail, ExternalLink, Crown, Sparkles
} from 'lucide-react';
import { api, currentUser, getValidSession, signInWithEmail, signUpWithEmail, signOut, type NovaUser } from '../lib/supabase';

type Props = {
  data: { games: any[]; tournaments: any[]; teams: any[]; announcements: any[]; posts: any[] };
  loading: boolean;
  onOpenAdmin: () => void;
};
type ExtraData = { matches: any[]; players: any[]; members: any[]; profiles: any[]; sponsors: any[]; results: any[] };

const NAV = [
  ['HOME', '/'], ['ABOUT', '/about'], ['GAMES', '/games'], ['TEAMS', '/teams'],
  ['PLAYERS', '/players'], ['TOURNAMENTS', '/tournaments'], ['MATCHES', '/matches'],
  ['NEWS', '/news'], ['COMMUNITY', '/community']
] as const;

const clean = (value: unknown) => String(value ?? '').replaceAll('_', ' ');
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'DATE TBA';
const slugOf = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const safeHref = (value?: string) => value && /^https?:\/\//i.test(value) ? value : undefined;

// Restored legacy NOVA roster: public team labels only, with no invented statistics.
const LEGACY_ROSTER = [
  { name: 'VIKAS', tag: 'NOVA VIKAS', role: 'IGL', number: '01', initial: 'V' },
  { name: 'DEEPAK', tag: 'NOVA DEEPAK', role: 'RUSHER', number: '02', initial: 'D' },
  { name: 'SATYAM', tag: 'NOVA SATYAM', role: 'SNIPER', number: '03', initial: 'S' },
  { name: 'ANIKET', tag: 'NOVA ANIKET', role: 'SECONDARY RUSHER', number: '04', initial: 'A' }
];

export function PublicSite({ data, loading, onOpenAdmin }: Props) {
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/');
  const [menuOpen, setMenuOpen] = useState(false);
  const [extra, setExtra] = useState<ExtraData>({ matches: [], players: [], members: [], profiles: [], sponsors: [], results: [] });
  const [extraLoading, setExtraLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin'|'signup'>('signin');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authUser, setAuthUser] = useState<NovaUser|null>(null);
  const [managedNavigation, setManagedNavigation] = useState<any[]>([]);
  const [managedSeo, setManagedSeo] = useState<any[]>([]);
  const [homepageSections, setHomepageSections] = useState<any[]>([]);
  const [customPages, setCustomPages] = useState<any[]>([]);

  useEffect(() => {
    const onPop = () => { setPath(window.location.pathname.replace(/\/$/, '') || '/'); setMenuOpen(false); };
    const onScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener('popstate', onPop);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('scroll', onScroll); };
  }, []);

  useEffect(() => {
    let live=true;
    Promise.all([
      api<any[]>('site_navigation',{select:'id,label,href,display_order,is_visible,open_in_new_tab',is_visible:'eq.true',order:'display_order.asc'}).catch(()=>[]),
      api<any[]>('seo_metadata',{select:'route_path,page_title,meta_description,canonical_url,og_image_url,robots_index'}).catch(()=>[]),
      api<any[]>('homepage_sections',{select:'id,section_key,title,subtitle,body,image_url,button_label,button_url,display_order,is_visible',is_visible:'eq.true',order:'display_order.asc'}).catch(()=>[]),
      api<any[]>('site_pages',{select:'id,title,slug,excerpt,content_markdown,seo_title,seo_description,published_at',status:'eq.published',order:'published_at.desc'}).catch(()=>[])
    ]).then(([nav,seo,sections,pages])=>{if(live){setManagedNavigation(nav);setManagedSeo(seo);setHomepageSections(sections);setCustomPages(pages);}});
    return ()=>{live=false;};
  }, []);

  useEffect(() => {
    const routeLabel = path.split('/').filter(Boolean).join(' / ').replaceAll('-', ' ');
    const route = path.split('/').filter(Boolean)[0] || 'home';
    const seo: Record<string, [string, string]> = {
      home: ['NOVA ORIGIN — Built to Rise', 'NOVA Origin is an esports collective built around competition, teams, players, tournaments and community.'],
      about: ['About NOVA ORIGIN — Our Story', 'Discover NOVA Origin, our esports vision, competitive values and the community behind the team.'],
      games: ['Games — NOVA ORIGIN Esports', 'Explore the games and competitive titles supported by NOVA Origin.'],
      teams: ['Teams — NOVA ORIGIN Esports', 'Meet NOVA Origin competitive teams, team divisions and active rosters.'],
      players: ['Players — NOVA ORIGIN Esports', 'Discover NOVA Origin players and their verified competitive profiles and statistics.'],
      tournaments: ['Tournaments — NOVA ORIGIN Esports', 'Explore NOVA Origin tournaments, event details, schedules and verified results.'],
      matches: ['Match Center — NOVA ORIGIN Esports', 'Follow NOVA Origin match schedules, live status and verified match results.'],
      news: ['News — NOVA ORIGIN Esports', 'Read official NOVA Origin announcements, esports updates and community news.'],
      community: ['Community — NOVA ORIGIN Esports', 'Connect with the NOVA Origin community and follow official updates.'],
      contact: ['Contact NOVA ORIGIN', 'Contact NOVA Origin for team enquiries, partnerships, media and general questions.'],
      join: ['Join NOVA ORIGIN', 'Send an application enquiry to become part of the NOVA Origin esports community.']
    };
    const [title, description] = seo[route] || [`NOVA ORIGIN — ${routeLabel.toUpperCase()}`, 'Explore this NOVA Origin esports profile, event or update.'];
    const managed = managedSeo.find(item=>item.route_path===path || item.route_path==='/'+route || (route==='home' && item.route_path==='/'));
    const customPage = route !== 'home' && path.split('/').filter(Boolean).length === 1 ? customPages.find((item:any)=>item.slug===route) : null;
    const finalTitle=managed?.page_title || customPage?.seo_title || customPage?.title || title;
    const finalDescription=managed?.meta_description || customPage?.seo_description || customPage?.excerpt || description;
    document.title = finalTitle;
    const setMeta = (selector: string, attr: 'content', value: string, create: () => HTMLElement) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) { el = create() as HTMLMetaElement; document.head.appendChild(el); }
      el.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', 'content', finalDescription, () => { const e=document.createElement('meta'); e.name='description'; return e; });
    setMeta('meta[property="og:title"]', 'content', finalTitle, () => { const e=document.createElement('meta'); e.setAttribute('property','og:title'); return e; });
    setMeta('meta[property="og:description"]', 'content', finalDescription, () => { const e=document.createElement('meta'); e.setAttribute('property','og:description'); return e; });
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image', () => { const e=document.createElement('meta'); e.name='twitter:card'; return e; });
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = managed?.canonical_url || ('https://nova-origin-esports.vercel.app' + (path === '/' ? '/' : path));
    if (managed?.og_image_url) {
      setMeta('meta[property="og:image"]', 'content', managed.og_image_url, () => { const e=document.createElement('meta'); e.setAttribute('property','og:image'); return e; });
      setMeta('meta[name="twitter:image"]', 'content', managed.og_image_url, () => { const e=document.createElement('meta'); e.name='twitter:image'; return e; });
    }
    setMeta('meta[name="robots"]', 'content', managed?.robots_index === false ? 'noindex, nofollow' : 'index, follow', () => { const e=document.createElement('meta'); e.name='robots'; return e; });
  }, [path, managedSeo, customPages]);

  useEffect(() => {
    let live = true;
    const read = async (table: string, query: Record<string, string>) => {
      try { return await api<any[]>(table, query); } catch { return []; }
    };
    (async () => {
      const [matches, players, members, sponsors, results] = await Promise.all([
        read('matches', { select: 'id,tournament_id,match_number,stage,round_name,scheduled_at,status,result_status,tournament:tournaments(title,game:games(name))', order: 'scheduled_at.asc.nullslast', limit: '12' }),
        read('player_game_stats', { select: 'id,player_id,game_id,kd_ratio,average_damage,matches_played,wins,eliminations,source_label,player:profiles(username,display_name,avatar_url,bio),game:games(name)', source_label: 'eq.verified', order: 'matches_played.desc', limit: '100' }),
        read('team_members', { select: 'id,team_id,user_id,team_role', limit: '250' }),
        read('sponsors', { select: 'id,name,logo_url,website_url,description,status', status: 'eq.active', order: 'created_at.desc', limit: '12' }),
        read('match_results', { select: 'id,match_id,team_id,player_id,placement,eliminations,points,status,verified_at,team:teams(name,team_tag),player:profiles(username,display_name),match:matches(tournament_id,match_number,round_name,scheduled_at)', status: 'eq.verified', order: 'created_at.desc', limit: '30' })
      ]);
      const profiles = await read('profiles', { select: 'id,username,display_name,avatar_url,bio', order: 'created_at.asc', limit: '100' });
      if (live) { setExtra({ matches, players, members, profiles, sponsors, results }); setExtraLoading(false); }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const syncAccount = async () => {
      const session = await getValidSession();
      if (!session) { if (active) setAuthUser(null); return; }
      try { const user = await currentUser(session.access_token); if (active) setAuthUser(user); }
      catch { signOut(); if (active) setAuthUser(null); }
    };
    const onAuthChange = () => { void syncAccount(); };
    void syncAccount();
    window.addEventListener('nova-auth-changed', onAuthChange);
    return () => { active = false; window.removeEventListener('nova-auth-changed', onAuthChange); };
  }, []);

  const submitAuth = async (e: FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthNotice(''); setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        const result = await signUpWithEmail(authEmail, authPassword, authName);
        if (result.access_token) {
          const session = await getValidSession();
          if (session) setAuthUser(await currentUser(session.access_token));
          setAuthNotice('Your NOVA account is ready.');
        } else {
          setAuthNotice('Check your email and confirm your address to finish creating your account, then sign in.');
          setAuthMode('signin');
        }
      } else {
        const result = await signInWithEmail(authEmail, authPassword);
        setAuthUser(await currentUser(result.access_token));
        setAuthNotice('You are signed in.');
      }
      setAuthPassword('');
    } catch (error: any) {
      setAuthError(error?.message || 'Could not complete sign in. Please try again.');
    } finally { setAuthBusy(false); }
  };

  const navigate = (to: string) => {
    const target = new URL(to, window.location.origin);
    window.history.pushState({}, '', target.pathname + target.search + target.hash);
    setPath(target.pathname.replace(/\/$/, '') || '/');
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const link = (to: string, label: string, className = '') => (
    <a className={className} href={to} onClick={e => { e.preventDefault(); navigate(to); }}>{label}</a>
  );

  const activeTeams = data.teams.length;
  const liveEvents = data.tournaments.filter(t => t.status === 'live').length;
  const gamesCount = data.games.length;
  const matchCount = extra.matches.length;
  const route = path.split('/').filter(Boolean);
  const slug = route[1] || '';
  const currentGame = route[0] === 'games' && slug ? data.games.find(x => x.slug === slug || slugOf(x.name) === slug) : null;
  const currentTeam = route[0] === 'teams' && slug ? data.teams.find(x => x.slug === slug || slugOf(x.name) === slug || x.id === slug) : null;
  const currentTournament = route[0] === 'tournaments' && slug ? data.tournaments.find(x => x.slug === slug || x.id === slug) : null;
  const currentPlayer = route[0] === 'players' && slug ? extra.players.find(x => x.player?.username === slug || x.player_id === slug) : null;
  const currentNews = route[0] === 'news' && slug ? data.announcements.find(x => slugOf(x.title) === slug || x.id === slug) : null;
  const currentCustomPage = route.length === 1 ? customPages.find((page:any) => page.slug === route[0]) : null;

  const sectionTitle = (index: string, kicker: string, first: string, accent: string, copy: string) => (
    <div className="no-section-head">
      <div><span className="no-kicker">{index} / {kicker}</span><h2>{first}<br/><em>{accent}</em></h2></div>
      <p>{copy}</p>
    </div>
  );

  const gameCards = (items = data.games) => (
    <div className="no-game-grid">
      {items.map((game: any, i: number) => (
        <a className="no-game-card" href={'/games/' + (game.slug || slugOf(game.name))} key={game.id} onClick={e => { e.preventDefault(); navigate('/games/' + (game.slug || slugOf(game.name))); }}>
          <div className={'no-game-art no-art-' + (i % 4)}><span className="no-index">0{i + 1}</span><div className="no-game-glyph"><Gamepad2 size={34}/></div><span className="no-art-orbit"/></div>
          <div className="no-card-foot"><div><small>{game.publisher || 'COMPETITIVE TITLE'}</small><h3>{game.name}</h3></div><ArrowUpRight/></div>
        </a>
      ))}
      {!loading && !items.length && <Empty text="Game titles will appear here once they are published."/>}
    </div>
  );

  const teamCards = (items = data.teams) => (
    <div className="no-team-list">
      {items.map((team: any, i: number) => {
        const count = extra.members.filter(m => m.team_id === team.id).length;
        return <a className="no-team-row" key={team.id} href={'/teams/' + (team.slug || slugOf(team.name))} onClick={e => { e.preventDefault(); navigate('/teams/' + (team.slug || slugOf(team.name))); }}>
          <span className="no-row-num">0{i + 1}</span><span className="no-team-logo">{team.logo_url ? <img src={team.logo_url} alt=""/> : (team.team_tag || 'N').slice(0, 3)}</span>
          <span className="no-team-name"><b>{team.name}</b><small>{team.description || 'NOVA ORIGIN COMPETITIVE ROSTER'}</small></span>
          <span className="no-team-meta">{team.game?.name || data.games.find(g => g.id === team.game_id)?.name || 'ESPORTS'}<small>{count ? count + ' PLAYERS' : 'ROSTER'}</small></span>
          <span className="no-team-tag">{team.team_tag || 'NOVA'}</span><ArrowUpRight className="no-row-arrow"/>
        </a>;
      })}
      {!loading && !items.length && <Empty text="The roster is being prepared. Team profiles will appear here soon."/>}
    </div>
  );

  const eventCards = (items = data.tournaments) => (
    <div className="no-event-grid">
      {items.map((event: any) => <article className="no-event-card" key={event.id}>
        <div className="no-event-art" style={safeHref(event.banner_url) ? { backgroundImage: 'linear-gradient(180deg,#080a0988,#080a09dd),url(' + event.banner_url + ')' } : undefined}>
          <span className={'no-event-status ' + (event.status === 'live' ? 'is-live' : '')}><i/> {clean(event.status)}</span><Trophy size={38}/><span className="no-event-format">{clean(event.format || 'TOURNAMENT')}</span>
        </div>
        <div className="no-event-body"><small>{event.game?.name || 'NOVA COMPETITION'}</small><h3>{event.title}</h3><p>{event.summary || 'The next challenge starts here.'}</p><div className="no-event-foot"><span>{dateLabel(event.starts_at)}</span><b>{event.prize_description || (event.team_size ? event.team_size + ' PLAYER FORMAT' : 'DETAILS INSIDE')}</b></div><div className="no-event-meta"><span>{event.max_entries} MAX ENTRIES</span><span>{clean(event.entry_type || 'free')} ENTRY</span><span>{clean(event.game_mode?.name || event.format || 'TOURNAMENT')}</span></div>
          <button onClick={() => navigate('/tournaments/' + (event.slug || event.id))}>VIEW EVENT <ArrowUpRight size={15}/></button>
        </div>
      </article>)}
      {!loading && !items.length && <Empty text="No published tournaments yet. Check back for the next event."/>}
    </div>
  );

  const playerCards = (items = extra.players) => (
    <div className="no-player-grid">
      {LEGACY_ROSTER.map(player => {
        const profile = extra.profiles.find((item: any) => {
          const display = String(item.display_name || '').trim().toLowerCase();
          const username = String(item.username || '').trim().toLowerCase();
          const expected = player.name.toLowerCase();
          return display === expected || username === expected || username.startsWith(expected + '_') || username.startsWith(expected + '-') || display.startsWith(expected + ' ') || display.replace(/[^a-z0-9]/g, '') === expected.toLowerCase();
        });
        const photo = safeHref(profile?.avatar_url);
        return <article className="no-player-card no-legacy-player-card" key={player.number}>
          <div className="no-player-photo no-legacy-player-photo">{photo ? <img src={photo} alt={player.name + ' player portrait'} loading="lazy" referrerPolicy="no-referrer"/> : <strong>{player.initial}</strong>}<span>PLAYER {player.number}</span></div>
          <small>{player.role}</small><h3>{profile?.display_name || player.name}</h3>
          <div className="no-legacy-player-tag">{player.tag}</div>
        </article>;
      })}
      {items.map((stat: any) => <a className="no-player-card" href={'/players/' + (stat.player?.username || stat.player_id)} key={stat.id} onClick={e => { e.preventDefault(); navigate('/players/' + (stat.player?.username || stat.player_id)); }}>
        <div className="no-player-photo">{stat.player?.avatar_url ? <img src={stat.player.avatar_url} alt=""/> : <Users size={34}/>}<span>VERIFIED</span></div>
        <small>{stat.game?.name || 'NOVA PLAYER'}</small><h3>{stat.player?.display_name || stat.player?.username || 'PLAYER'}</h3>
        <div className="no-player-stats"><span><b>{stat.kd_ratio ?? '—'}</b>K/D</span><span><b>{stat.matches_played ?? '—'}</b>MATCHES</span><span><b>{stat.wins ?? '—'}</b>WINS</span></div>
      </a>)}
    </div>
  );

  const newsCards = () => (
    <div className="no-news-grid">
      {data.announcements.map((item: any) => <a className="no-news-card" href={'/news/' + slugOf(item.title)} key={item.id} onClick={e => { e.preventDefault(); navigate('/news/' + slugOf(item.title)); }}>
        <span className="no-news-label">NOVA TRANSMISSION</span><h3>{item.title}</h3><p>{item.body}</p><div><small>{dateLabel(item.published_at || item.created_at)}</small><b>READ STORY <ArrowUpRight size={14}/></b></div>
      </a>)}
      {!loading && !data.announcements.length && <Empty text="No public announcements yet."/>}
    </div>
  );

  const matchCards = () => (
    <div className="no-match-list">
      {extra.matches.map((match: any) => {
        const sides = [...new Set(extra.results.filter((r: any) => r.match_id === match.id).map((r: any) => r.team?.name || r.player?.display_name || r.player?.username).filter(Boolean))];
        return <article className="no-match-card" key={match.id}>
          <div><small>{match.tournament?.title || 'NOVA MATCH CENTER'}</small><h3>{match.round_name || match.stage || 'MATCH ' + match.match_number}</h3><span>{dateLabel(match.scheduled_at)}</span></div>
          <div className="no-match-versus">{sides.length ? sides.slice(0,2).map((side: string, i: number) => <span className="no-match-side" key={side}>{i > 0 && <i>VS</i>}<b>{side}</b></span>) : <b className="no-match-pending">TEAMS TO BE ANNOUNCED</b>}</div>
          <span className={'no-match-status ' + (match.status === 'live' ? 'is-live' : '')}>{clean(match.status)}</span>
        </article>;
      })}
      {!extraLoading && !extra.matches.length && <Empty text="Match schedules will appear here when published."/>}
    </div>
  );

  const sponsors = () => <div className="no-sponsor-grid">{extra.sponsors.map(s => <a key={s.id} href={safeHref(s.website_url) || '#partners'} target={safeHref(s.website_url) ? '_blank' : undefined} rel="noreferrer">{s.logo_url ? <img src={s.logo_url} alt={s.name}/> : <b>{s.name}</b>}</a>)}{!extraLoading && !extra.sponsors.length && <p className="no-muted">Partner announcements coming soon.</p>}</div>;

  const contentPage = () => {
    if (currentGame) {
      const gameTeams = data.teams.filter((t:any) => t.game_id === currentGame.id);
      const gameEvents = data.tournaments.filter((t:any) => t.game_id === currentGame.id);
      const gamePlayers = extra.players.filter((p:any) => p.game_id === currentGame.id);
      const gameMatches = extra.matches.filter((m:any) => m.tournament?.game?.name === currentGame.name);
      return <><DetailShell kicker="GAME PROFILE / COMPETITIVE DIVISION" title={currentGame.name} copy={currentGame.publisher || 'A NOVA ORIGIN competitive title.'}>
        <div className="no-detail-grid"><div className="no-detail-emblem"><Gamepad2 size={70}/></div><div><span className="no-kicker">THE ARENA / {currentGame.slug || slugOf(currentGame.name)}</span><p>Competitive action. Shared purpose. Explore published NOVA teams, verified player records and events for {currentGame.name}.</p><p className="no-muted">{gameTeams.length} public teams · {gamePlayers.length} verified player records · {gameEvents.length} published events</p><button className="no-btn" onClick={() => navigate('/teams')}>VIEW TEAMS <ArrowUpRight size={16}/></button></div></div>
      </DetailShell>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">DIVISION / ACTIVE ROSTERS</span><h2>TEAMS IN<br/><em>THIS ARENA.</em></h2></div><p>Public team profiles for this game.</p></div>{teamCards(gameTeams)}</section>
      <section className="no-band"><div className="no-section"><div className="no-section-head"><div><span className="no-kicker">VERIFIED COMPETITORS</span><h2>PLAYERS<br/><em>ON RECORD.</em></h2></div><p>Player records filtered to this game.</p></div>{playerCards(gamePlayers.slice(0,8))}</div></section>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">THE CIRCUIT</span><h2>TOURNAMENTS<br/><em>& EVENTS.</em></h2></div><p>Published competitions for this game.</p></div>{eventCards(gameEvents)}</section>
      <section className="no-band"><div className="no-section"><div className="no-section-head"><div><span className="no-kicker">MATCH CENTER</span><h2>FIXTURES<br/><em>& RESULTS.</em></h2></div><p>Published schedules connected to this game's tournaments.</p></div><div className="no-match-list">{gameMatches.map((m:any)=><article className="no-match-card" key={m.id}><div><small>{m.tournament?.title || currentGame.name}</small><h3>{m.round_name || m.stage || 'MATCH '+m.match_number}</h3><span>{dateLabel(m.scheduled_at)}</span></div><span className={'no-match-status '+(m.status==='live'?'is-live':'')}>{clean(m.status)}</span></article>)}{!extraLoading&&!gameMatches.length&&<Empty text="No published fixtures are available for this game yet."/>}</div></div></section></>;
    }
    if (currentTeam) {
      const teamResults = extra.results.filter((r:any) => r.team_id === currentTeam.id && r.verified_at);
      const roster = extra.members.filter((m:any) => m.team_id === currentTeam.id).map((m:any) => ({ ...m, profile: extra.profiles.find((p:any) => p.id === m.user_id) })).filter((m:any) => m.profile);
      return <><DetailShell kicker="TEAM PROFILE" title={currentTeam.name} copy={currentTeam.description || 'One roster. One standard. Built to rise.'}>
        <div className="no-detail-grid"><div className="no-detail-emblem">{currentTeam.logo_url ? <img src={currentTeam.logo_url} alt=""/> : <Shield size={70}/>}</div><div><span className="no-kicker">{currentTeam.team_tag || 'NOVA'} / {data.games.find(g => g.id === currentTeam.game_id)?.name || 'ESPORTS'}</span><p>Follow this roster's published appearances and verified competitive results.</p><p className="no-muted">{roster.length} public roster members · {teamResults.length} verified result records</p></div></div>
      </DetailShell>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">TEAM / ROSTER</span><h2>THE PEOPLE<br/><em>BEHIND THE TAG.</em></h2></div><p>Public roster members only.</p></div><div className="no-player-grid">{roster.map((m:any,i:number)=><article className="no-player-card" key={m.id}><div className="no-player-photo">{m.profile.avatar_url ? <img src={m.profile.avatar_url} alt=""/> : <Users size={34}/>}<span>0{i+1}</span></div><small>{clean(m.team_role)}</small><h3>{m.profile.display_name || m.profile.username}</h3>{m.profile.username && <a className="no-section-link" href={'/players/'+m.profile.username} onClick={e=>{e.preventDefault();navigate('/players/'+m.profile.username);}}>PLAYER PROFILE <ArrowUpRight size={14}/></a>}</article>)}{!extraLoading && !roster.length && <Empty text="No public roster members are listed yet."/>}</div></section>
      <section className="no-band"><div className="no-section"><div className="no-section-head"><div><span className="no-kicker">VERIFIED COMPETITIVE HISTORY</span><h2>RESULTS<br/><em>THAT COUNT.</em></h2></div><p>Only result records verified by NOVA Origin.</p></div><div className="no-result-grid">{teamResults.map((r:any)=><article className="no-result-card" key={r.id}><Trophy size={20}/><span>{r.match?.round_name || 'MATCH RESULT'}</span><b>{r.placement?'PLACE #'+r.placement:(r.points??'—')+' PTS'}</b><small>{r.eliminations??0} ELIMINATIONS · VERIFIED</small></article>)}{!extraLoading&&!teamResults.length&&<Empty text="No verified team results have been published yet."/>}</div></div></section></>;
    }
    if (currentTournament) {
      const eventMatches = extra.matches.filter((m:any) => m.tournament_id === currentTournament.id);
      const eventResults = extra.results.filter((r:any) => r.match?.tournament_id === currentTournament.id && r.verified_at);
      return <DetailShell kicker="TOURNAMENT / EVENT" title={currentTournament.title} copy={currentTournament.description || currentTournament.summary || 'The next battle begins.'}>
        <div className="no-detail-grid"><div className="no-detail-emblem">{safeHref(currentTournament.banner_url) ? <img src={currentTournament.banner_url} alt="" /> : <Trophy size={70}/>}</div><div><span className="no-kicker">{clean(currentTournament.status)} / {currentTournament.game?.name || 'NOVA EVENT'}</span><p>{currentTournament.prize_description || 'Event details and schedule will be published here.'}</p><div className="no-tournament-facts"><span><small>GAME MODE</small><b>{currentTournament.game_mode?.name || clean(currentTournament.format || 'TOURNAMENT')}</b></span><span><small>TEAM SIZE</small><b>{currentTournament.team_size || '—'} PLAYERS</b></span><span><small>MAX ENTRIES</small><b>{currentTournament.max_entries || '—'}</b></span><span><small>ENTRY</small><b>{clean(currentTournament.entry_type || 'free')}</b></span><span><small>EVENT START</small><b>{dateLabel(currentTournament.starts_at)}</b></span><span><small>EVENT END</small><b>{dateLabel(currentTournament.ends_at)}</b></span><span><small>REGISTRATION OPENS</small><b>{dateLabel(currentTournament.registration_opens_at)}</b></span><span><small>REGISTRATION CLOSES</small><b>{dateLabel(currentTournament.registration_closes_at)}</b></span></div><p className="no-muted">Registration status: {currentTournament.status === 'registration_open' ? 'Open according to the published event status' : currentTournament.status === 'registration_closed' ? 'Closed' : 'Not currently open'}</p><button className="no-btn" onClick={()=>navigate('/contact?message='+encodeURIComponent('I would like to enquire about tournament: '+currentTournament.title+'. Please share the event and registration details.'))}>EVENT ENQUIRY <ArrowUpRight size={16}/></button></div></div>
        <div className="no-detail-section"><span className="no-kicker">EVENT SCHEDULE / {eventMatches.length.toString().padStart(2,'0')} MATCHES</span><div className="no-match-list">{eventMatches.map((m:any)=><article className="no-match-card" key={m.id}><div><small>{currentTournament.title}</small><h3>{m.round_name || m.stage || 'MATCH '+m.match_number}</h3><span>{dateLabel(m.scheduled_at)}</span></div><span className={'no-match-status '+(m.status==='live'?'is-live':'')}>{clean(m.status)}</span></article>)}{!eventMatches.length && <Empty text="The tournament schedule has not been published yet."/>}</div></div>
        <div className="no-detail-section"><span className="no-kicker">VERIFIED RESULTS / {eventResults.length.toString().padStart(2,'0')}</span><div className="no-result-grid">{eventResults.map((r:any)=><article className="no-result-card" key={r.id}><Trophy size={20}/><span>{r.team?.name || r.player?.display_name || r.player?.username || 'COMPETITOR'}</span><b>{r.placement ? 'PLACE #'+r.placement : (r.points ?? '—')+' PTS'}</b><small>{r.eliminations ?? 0} ELIMINATIONS · VERIFIED</small></article>)}{!eventResults.length && <Empty text="Verified results will appear here when matches are completed and reviewed."/>}</div></div>
      </DetailShell>;
    }
    if (route[0] === 'players' && !slug) {
      return <>
        <PageHero kicker="NOVA ROSTER / PLAYER DIRECTORY" title="MEET THE" accent="PLAYERS." copy="Public NOVA Origin member profiles. Competitive statistics appear only when verified." />
        <section className="no-section">
          <div className="no-player-grid">
            {extra.profiles.map((profile:any) => {
              const stats = extra.players.filter((item:any) => item.player_id === profile.id);
              return <a className="no-player-card" key={profile.id} href={'/players/' + (profile.username || profile.id)} onClick={e => { e.preventDefault(); navigate('/players/' + (profile.username || profile.id)); }}>
                <div className="no-player-photo">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <Users size={34}/>}<span> NOVA MEMBER </span></div>
                <small>PLAYER PROFILE</small><h3>{profile.display_name || profile.username || 'NOVA PLAYER'}</h3>
                {profile.bio && <p>{profile.bio}</p>}
                {stats.length > 0 && <div className="no-player-stats"><span><b>{stats.length}</b>VERIFIED RECORDS</span></div>}
              </a>;
            })}
            {!extraLoading && !extra.profiles.length && <Empty text="No public player profiles are available yet."/>}
          </div>
        </section>
      </>;
    }
    if (currentPlayer) {
      const playerId = currentPlayer.player_id;
      const playerStats = extra.players.filter((p:any) => p.player_id === playerId);
      const playerTeams = extra.members.filter((m:any) => m.user_id === playerId).map((m:any) => ({...m, team:data.teams.find((t:any)=>t.id===m.team_id)})).filter((m:any)=>m.team);
      const playerResults = extra.results.filter((r:any) => r.player_id === playerId && r.verified_at);
      const profile = currentPlayer.player || {};
      return <><DetailShell kicker="PLAYER PROFILE / VERIFIED COMPETITOR" title={profile.display_name || profile.username || 'NOVA PLAYER'} copy={profile.bio || 'A competitor in the NOVA Origin ecosystem. Verified statistics are shown only where official records are available.'}>
        <div className="no-detail-grid"><div className="no-detail-emblem">{profile.avatar_url ? <img src={profile.avatar_url} alt=""/> : <Users size={70}/>}</div><div><span className="no-kicker">@{profile.username || 'NOVA PLAYER'} / PUBLIC PROFILE</span><p>{profile.bio || 'Player biography has not been published.'}</p><p className="no-muted">{playerTeams.length} public team memberships · {playerStats.length} verified game stat records</p></div></div>
      </DetailShell>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">COMPETITIVE RECORD</span><h2>VERIFIED<br/><em>STATISTICS.</em></h2></div><p>Only verified records from NOVA Origin data are displayed.</p></div>
        <div className="no-player-grid">{playerStats.map((stat:any)=><article className="no-player-card" key={stat.id}><small>{stat.game?.name || 'COMPETITIVE GAME'}</small><div className="no-player-stats"><span><b>{stat.kd_ratio ?? '—'}</b>K/D</span><span><b>{stat.matches_played ?? '—'}</b>MATCHES</span><span><b>{stat.wins ?? '—'}</b>WINS</span></div><p className="no-muted">{stat.eliminations ?? '—'} verified eliminations · {stat.average_damage ?? '—'} average damage</p></article>)}{!playerStats.length && <Empty text="No verified game statistics have been published for this player yet."/>}</div>
      </section>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">TEAM AFFILIATION</span><h2>THE SQUAD<br/><em>CONNECTION.</em></h2></div><p>Public teams this player is listed with.</p></div><div className="no-team-list">{playerTeams.map((m:any)=><a className="no-team-row" key={m.id} href={'/teams/'+(m.team.slug||slugOf(m.team.name))} onClick={e=>{e.preventDefault();navigate('/teams/'+(m.team.slug||slugOf(m.team.name)));}}><span className="no-row-num">↗</span><span className="no-team-logo">{m.team.logo_url?<img src={m.team.logo_url} alt=""/>:(m.team.team_tag||'N').slice(0,3)}</span><span className="no-team-name"><b>{m.team.name}</b><small>{clean(m.team_role)}</small></span><span className="no-team-tag">{m.team.team_tag||'NOVA'}</span><ArrowUpRight className="no-row-arrow"/></a>)}{!playerTeams.length&&<Empty text="No public team affiliation is listed for this player."/>}</div></section>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">COMPETITION HISTORY</span><h2>RESULTS<br/><em>ON RECORD.</em></h2></div><p>Verified player result entries.</p></div><div className="no-result-grid">{playerResults.map((r:any)=><article className="no-result-card" key={r.id}><Trophy size={20}/><span>{r.match?.round_name || 'MATCH RESULT'}</span><b>{r.placement?'PLACE #'+r.placement:(r.points??'—')+' PTS'}</b><small>{r.eliminations??0} ELIMINATIONS · VERIFIED</small></article>)}{!playerResults.length&&<Empty text="No verified match results are listed for this player yet."/>}</div></section></>;
    }
    if (currentNews) {
      const relatedNews = data.announcements.filter((item:any) => item.id !== currentNews.id).slice(0,3);
      const published = currentNews.published_at || currentNews.created_at;
      return <><DetailShell kicker="NOVA TRANSMISSION / OFFICIAL UPDATE" title={currentNews.title} copy="An official update from the NOVA Origin ecosystem.">
        <article className="no-article">
          <div className="no-article-meta"><span><i/> OFFICIAL NOVA UPDATE</span><time>{dateLabel(published)}</time></div>
          <div className="no-article-body">{(currentNews.body || '').split(/\\n{2,}/).map((paragraph:string,i:number)=><p key={i}>{paragraph}</p>)}</div>
          <div className="no-article-end"><span>END OF TRANSMISSION</span><button className="no-btn ghost" onClick={()=>navigate('/news')}>BACK TO ALL NEWS <ArrowUpRight size={15}/></button></div>
        </article>
      </DetailShell>
      <section className="no-section"><div className="no-section-head"><div><span className="no-kicker">MORE TRANSMISSIONS</span><h2>STAY IN<br/><em>THE LOOP.</em></h2></div><p>More official updates from NOVA Origin.</p></div><div className="no-news-grid">{relatedNews.map((item:any)=><a className="no-news-card" href={'/news/'+slugOf(item.title)} key={item.id} onClick={e=>{e.preventDefault();navigate('/news/'+slugOf(item.title));}}><span className="no-news-label">NOVA TRANSMISSION</span><h3>{item.title}</h3><p>{item.body}</p><div><small>{dateLabel(item.published_at||item.created_at)}</small><b>READ STORY <ArrowUpRight size={14}/></b></div></a>)}{!relatedNews.length&&<Empty text="More official updates will appear here when published."/>}</div></section></>;
    }
    if (currentCustomPage) {
      return <><PageHero kicker="NOVA ORIGIN / CUSTOM PAGE" title={currentCustomPage.title} accent="NOVA ORIGIN." copy={currentCustomPage.excerpt || 'Explore this official NOVA Origin page.'}/><section className="no-section"><article className="no-article"><div className="no-article-body">{(currentCustomPage.content_markdown || '').split(/\\n{2,}/).map((block:string,i:number)=>{const value=block.trim();if(!value)return null;if(value.startsWith('### '))return <h3 key={i}>{value.slice(4)}</h3>;if(value.startsWith('## '))return <h2 key={i}>{value.slice(3)}</h2>;if(value.startsWith('# '))return <h2 key={i}>{value.slice(2)}</h2>;if(value.split('\\n').every((line:string)=>/^[-*]\\s+/.test(line)))return <ul key={i}>{value.split('\\n').map((line:string,j:number)=><li key={j}>{line.replace(/^[-*]\\s+/,'')}</li>)}</ul>;return <p key={i}>{value.split('\\n').map((line:string,j:number)=><span key={j}>{j>0&&<br/>}{line}</span>)}</p>;})}</div></article></section></>;
    }
    const pages: Record<string, { kicker: string; title: string; accent: string; copy: string }> = {
      about: { kicker: 'THE NOVA STORY', title: 'MORE THAN', accent: 'A MOVEMENT.', copy: 'We are a collective of players, creators and competitors building a culture around commitment, community and competition.' },
      games: { kicker: 'OUR ARENA', title: 'THE GAMES', accent: 'WE PLAY.', copy: 'Different battlegrounds. One standard: excellence.' },
      teams: { kicker: 'THE COLLECTIVE', title: 'BUILT AS ONE.', accent: 'PLAY AS MANY.', copy: 'Every role matters. Every player moves the team forward.' },
      players: { kicker: 'THE ROSTER', title: 'MEET THE', accent: 'PLAYERS.', copy: 'The NOVA Origin team roster, alongside verified competitive statistics.' },
      tournaments: { kicker: 'THE CIRCUIT', title: 'THE NEXT', accent: 'BATTLE BEGINS.', copy: 'Discover upcoming and live competitions from the NOVA ecosystem.' },
      matches: { kicker: 'LIVE COMPETITION', title: 'MATCH', accent: 'CENTER.', copy: 'Schedules and confirmed match status from the competition database.' },
      news: { kicker: 'TRANSMISSIONS', title: 'LATEST', accent: 'INTELLIGENCE.', copy: 'Official announcements and updates from across NOVA Origin.' },
      community: { kicker: 'THE COLLECTIVE', title: 'FIND YOUR', accent: 'PLACE HERE.', copy: 'Join the conversation and follow NOVA Origin across our community channels.' },
      contact: { kicker: 'MAKE CONTACT', title: 'LET’S BUILD', accent: 'WHAT’S NEXT.', copy: 'For team enquiries, partnerships, media and general questions.' },
      join: { kicker: 'YOUR NEXT CHAPTER', title: 'RISE WITH', accent: 'NOVA ORIGIN.', copy: 'Tell us how you would like to be part of the NOVA Origin community.' }
    };
    const page = pages[route[0] || ''] || pages.about;
    return <><PageHero {...page}/>{route[0] === 'games' && gameCards()}{route[0] === 'teams' && teamCards()}{route[0] === 'players' && playerCards()}{route[0] === 'tournaments' && eventCards()}{route[0] === 'matches' && matchCards()}{route[0] === 'news' && newsCards()}{route[0] === 'about' && <AboutStory/>}{route[0] === 'community' && <CommunityBlock posts={data.posts} navigate={navigate} />}{route[0] === 'contact' && <ContactBlock/>}{route[0] === 'join' && <ContactBlock join/>}</>;
  };

  const home = () => <>
    <section className="no-hero">
      <div className="no-hero-grid"/><div className="no-hero-glow"/><div className="no-hero-geometry"><span/><span/><span/><b>N</b></div>
      <div className="no-hero-content"><span className="no-kicker"><i/> THE NEXT WAVE OF COMPETITION</span><div className="no-hero-badge"><Sparkles size={12}/> INDEPENDENT ESPORTS COLLECTIVE / INDIA</div>
        <h1>BUILT TO<br/><em>RISE.</em> READY<br/>TO <span>DOMINATE.</span></h1>
        <p>More than a team. A collective of players, creators and competitors building something that lasts.</p>
        <div className="no-hero-actions"><button className="no-btn" onClick={() => navigate('/teams')}>MEET THE ROSTER <ArrowUpRight size={16}/></button><button className="no-btn ghost" onClick={() => navigate('/tournaments')}>EXPLORE EVENTS <ArrowRight size={16}/></button></div>
        <div className="no-hero-meta"><span><i/> COMMUNITY ONLINE</span><span>INDIA / GLOBAL</span><span>EST. 2024</span></div>
      </div>
      <div className="no-hero-index"><span>NO / 001</span><b>26°50' N<br/>80°56' E</b><small>SCROLL TO EXPLORE ↓</small></div>
    </section>
    <section className="no-stats">{[{value:activeTeams,label:'PUBLIC TEAMS'},{value:liveEvents,label:'LIVE EVENTS'},{value:gamesCount,label:'GAME TITLES'},{value:matchCount,label:'SCHEDULED MATCHES'}].filter(item=>item.value>0).map(item=><div key={item.label}><b>{item.value.toString().padStart(2,'0')}</b><span>{item.label}</span></div>)}</section>
    {homepageSections.map((section:any) => <section className="no-section" key={section.id}>
      <div className="no-section-head"><div><span className="no-kicker">{clean(section.section_key).toUpperCase()} / NOVA ORIGIN</span><h2>{section.title}</h2></div><p>{section.subtitle}</p></div>
      {section.image_url && safeHref(section.image_url) && <div className="no-detail-emblem"><img src={section.image_url} alt={section.title}/></div>}
      {section.body && <article className="no-article"><div className="no-article-body">{section.body.split(/\\n{2,}/).map((paragraph:string,i:number)=><p key={i}>{paragraph}</p>)}</div></article>}
      {section.button_label && section.button_url && <div className="no-section-link">{link(section.button_url,section.button_label)}<ArrowUpRight size={15}/></div>}
    </section>)}
    <section className="no-section">{sectionTitle('01','OUR ARENA','THE GAMES','WE PLAY.','Different battlegrounds. One standard: excellence.')}{gameCards(data.games.slice(0,3))}<div className="no-section-link">{link('/games','EXPLORE ALL GAMES')}<ArrowUpRight size={15}/></div></section>
    <section className="no-band"><div className="no-section">{sectionTitle('02','THE COLLECTIVE','BUILT AS ONE.','PLAY AS MANY.','Every role matters. Every player moves the team forward.')}{teamCards(data.teams.slice(0,5))}<div className="no-section-link">{link('/teams','VIEW THE FULL ROSTER')}<ArrowUpRight size={15}/></div></div></section>
    <section className="no-section">{sectionTitle('03','THE CIRCUIT','THE NEXT','BATTLE BEGINS.','Follow the action, find your next challenge and stay in the loop.')}{eventCards(data.tournaments.slice(0,3))}<div className="no-section-link">{link('/tournaments','ALL TOURNAMENTS')}<ArrowUpRight size={15}/></div></section>
    <section className="no-band"><div className="no-section">{sectionTitle('04','THE ROSTER','MEET THE','PLAYERS.','The NOVA Origin squad. Verified competitive records appear separately when available.')}{playerCards(extra.players.slice(0,4))}</div></section>
    <section className="no-section">{sectionTitle('05','MATCH CENTER','THE GAME','IS ON.','Schedules and confirmed status. No invented live scores.')}{matchCards()}</section>
    <section className="no-band"><div className="no-section">{sectionTitle('06','VERIFIED RESULTS','THE TROPHY','ROOM.','Milestones from verified match records only.')}
      <div className="no-result-grid">{extra.results.filter((r:any)=>r.verified_at).slice(0,6).map((r:any)=><article className="no-result-card" key={r.id}><Trophy size={22}/><span>{r.team?.name || r.player?.display_name || r.player?.username || 'COMPETITOR'}</span><b>{r.placement ? 'PLACE #' + r.placement : (r.points ?? '—') + ' PTS'}</b><small>{r.eliminations ?? 0} ELIMINATIONS · VERIFIED</small></article>)}{!extraLoading && !extra.results.some((r:any)=>r.verified_at) && <Empty text="Verified achievements will appear here once match results are approved."/>}</div>
    </div></section>
    <section className="no-band"><div className="no-section">{sectionTitle('06','TRANSMISSIONS','LATEST','UPDATES.','Official announcements and community highlights.')}{newsCards()}</div></section>
    <section className="no-section no-partners">{sectionTitle('07','BACKED BY','OUR','PARTNERS.','The organisations helping the NOVA journey move forward.')}{sponsors()}</section>
    <section className="no-join"><span className="no-kicker">YOUR NEXT CHAPTER STARTS HERE</span><h2>READY TO<br/><em>RISE WITH US?</em></h2><p>Find your place in the origin.</p><div><button className="no-btn" onClick={() => navigate('/join')}>JOIN NOVA ORIGIN <ArrowUpRight size={16}/></button><button className="no-btn ghost" onClick={() => navigate('/contact')}>CONTACT THE TEAM <Mail size={16}/></button></div></section>
  </>;

  return <div className="nova-public">
    <div className="no-topline"><span><i/> NOVA ORIGIN</span><span>BUILT FOR THE NEXT LEVEL</span><span>INDIA · ESPORTS</span></div>
    <header className={'no-header ' + (scrolled ? 'is-scrolled' : '')}>
      <button className="no-brand" onClick={() => navigate('/')} aria-label="NOVA Origin home"><span className="no-brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 31V9L30 31V9" stroke="currentColor" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter"/><path d="M8 9H15L30 24" stroke="currentColor" strokeWidth="1.5" opacity=".55"/><path d="M27 9H32V14" stroke="currentColor" strokeWidth="2.5"/></svg><i/></span><span><b>NOVA</b><small>ORIGIN</small></span></button>
      <nav className={menuOpen ? 'no-nav open' : 'no-nav'}>{(managedNavigation.length ? managedNavigation.map(item=>({label:item.label,href:item.href,external:!!item.open_in_new_tab})) : NAV.map(([label,href])=>({label,href,external:false}))).map(item => <a key={item.href} href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noreferrer' : undefined} className={path === item.href ? 'active' : ''} onClick={e => {if(!item.external){e.preventDefault();navigate(item.href);}}}>{item.label}</a>)}</nav>
      <div className="no-header-actions"><span className="no-open-badge"><i/> OPEN TO COMPETE</span><button className="no-auth-btn" onClick={()=>{setAuthOpen(true);setAuthError('');setAuthNotice('');}}>{authUser ? (authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'ACCOUNT') : 'SIGN IN'} <ArrowUpRight size={13}/></button><button className="no-community-btn" onClick={() => navigate('/community')}>COMMUNITY <ArrowUpRight size={14}/></button><button className="no-menu" aria-label="Toggle navigation" onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X/> : <Menu/>}</button></div>
    </header>
    <main>{path === '/' ? home() : contentPage()}</main>
    {authOpen && <div className="no-auth-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthOpen(false);}}>
      <section className="no-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="no-auth-title">
        <button className="no-auth-close" onClick={()=>setAuthOpen(false)} aria-label="Close sign in"><X size={20}/></button>
        {authUser ? <>
          <span className="no-kicker">NOVA ID / ACCOUNT</span><h2 id="no-auth-title">WELCOME<br/><em>BACK.</em></h2>
          <p className="no-auth-copy">{authUser.email || 'Signed-in NOVA member'}</p>
          <button className="no-btn" onClick={()=>{signOut();setAuthUser(null);setAuthOpen(false);}}>SIGN OUT <ArrowUpRight size={15}/></button>
        </> : <>
          <span className="no-kicker">NOVA ID / PLAYER ACCESS</span><h2 id="no-auth-title">{authMode==='signin'?'SIGN IN TO':'CREATE YOUR'}<br/><em>NOVA ID.</em></h2>
          <p className="no-auth-copy">Use your email to access your NOVA Origin account. Tournament entry is subject to each event's published rules.</p>
          <form className="no-auth-form" onSubmit={submitAuth}>
            {authMode==='signup' && <label>DISPLAY NAME<input value={authName} onChange={e=>setAuthName(e.target.value)} required minLength={2} maxLength={60} autoComplete="name"/></label>}
            <label>EMAIL ADDRESS<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required autoComplete="email"/></label>
            <label>PASSWORD<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} required minLength={8} autoComplete={authMode==='signin'?'current-password':'new-password'}/></label>
            {authError && <p className="no-auth-error" role="alert">{authError}</p>}
            {authNotice && <p className="no-auth-notice" role="status">{authNotice}</p>}
            <button className="no-btn" type="submit" disabled={authBusy}>{authBusy?'PLEASE WAIT…':authMode==='signin'?'SIGN IN':'CREATE ACCOUNT'} <ArrowUpRight size={15}/></button>
          </form>
          <button className="no-auth-switch" onClick={()=>{setAuthMode(authMode==='signin'?'signup':'signin');setAuthError('');setAuthNotice('');}}>{authMode==='signin'?'NEW TO NOVA? CREATE AN ACCOUNT':'ALREADY HAVE AN ACCOUNT? SIGN IN'}</button>
        </>}
      </section>
    </div>}
    <footer className="no-footer"><div className="no-footer-main"><button className="no-brand" onClick={() => navigate('/')}><span className="no-brand-mark">N<i/></span><span><b>NOVA</b><small>ORIGIN</small></span></button><p>More than a team. A collective built to rise, compete and create what comes next.</p><div className="no-footer-social"><a href="mailto:hello@novaorigin.gg?subject=NOVA%20Origin%20Social" aria-label="Social enquiries"><Instagram/></a><a href="mailto:hello@novaorigin.gg?subject=NOVA%20Origin%20Media" aria-label="Media enquiries"><Youtube/></a><a href="mailto:hello@novaorigin.gg?subject=NOVA%20Origin%20Community" aria-label="Community enquiries"><Disc3/></a></div></div><div className="no-footer-links"><div><b>EXPLORE</b>{NAV.slice(1,6).map(([label,to]) => <a key={to} href={to} onClick={e=>{e.preventDefault();navigate(to);}}>{label}</a>)}</div><div><b>COMPETE</b>{NAV.slice(6).map(([label,to]) => <a key={to} href={to} onClick={e=>{e.preventDefault();navigate(to);}}>{label}</a>)}</div><div><b>CONTACT</b><a href="mailto:hello@novaorigin.gg">hello@novaorigin.gg</a><button onClick={onOpenAdmin}>ADMIN ACCESS <ArrowUpRight size={13}/></button></div></div><div className="no-footer-bottom"><span>© {new Date().getFullYear()} NOVA ORIGIN. ALL SYSTEMS NOMINAL.</span><span>THE NEXT WAVE OF COMPETITION.</span></div></footer>
  </div>;
}

function Empty({ text }: { text: string }) { return <div className="no-empty">{text}</div>; }
function PageHero({ kicker, title, accent, copy }: { kicker: string; title: string; accent: string; copy: string }) { return <section className="no-page-hero"><span className="no-kicker">{kicker}</span><h1>{title}<br/><em>{accent}</em></h1><p>{copy}</p></section>; }
function DetailShell({ kicker, title, copy, children }: { kicker: string; title: string; copy: string; children: ReactNode }) { return <><PageHero kicker={kicker} title={title} accent="" copy={copy}/><section className="no-section">{children}</section></>; }
function AboutStory() { return <section className="no-section no-about-grid"><div><span className="no-kicker">OUR PHILOSOPHY / 001</span><h2>MORE THAN A NAME.<br/><em>A MOVEMENT.</em></h2></div><div><p>We believe competition is stronger when community comes first. NOVA Origin brings players, creators and supporters together around a shared standard: show up, improve, respect the game and build something that lasts.</p><div className="no-values"><span><b>01</b> DISCIPLINE</span><span><b>02</b> UNITY</span><span><b>03</b> EVOLUTION</span></div></div></section>; }
function CommunityBlock({ posts, navigate }: { posts: any[]; navigate: (to:string)=>void }) { return <section className="no-section"><div className="no-community-panel"><span className="no-kicker">FIND YOUR PLACE IN THE ORIGIN</span><h2>THE ORIGIN<br/><em>IS EVERYONE.</em></h2><p>Follow the journey, share the moments and meet the people behind the tag.</p><div><a className="no-btn" href="mailto:hello@novaorigin.gg?subject=NOVA%20Origin%20Community">JOIN THE COMMUNITY <Mail size={15}/></a><a className="no-btn ghost" href="mailto:hello@novaorigin.gg?subject=NOVA%20Origin%20Updates">FOLLOW UPDATES <Mail size={15}/></a></div></div><h3 className="no-subhead">COMMUNITY TRANSMISSIONS</h3><div className="no-news-grid">{posts.map(p=><article className="no-news-card" key={p.id}><span className="no-news-label">COMMUNITY UPDATE</span><p>{p.content}</p><small>{dateLabel(p.created_at)}</small></article>)}{!posts.length && <Empty text="Community posts will appear here when published."/>}</div></section>; }
function ContactBlock({ join = false }: { join?: boolean }) {
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [kind,setKind]=useState(join?'Player application':'General enquiry');
  const [message,setMessage]=useState(()=>new URLSearchParams(window.location.search).get('message') || '');
  const [website,setWebsite]=useState('');
  const [error,setError]=useState('');
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  const submit=async(e:FormEvent)=>{
    e.preventDefault(); setError('');
    if(website.trim()) return;
    if(name.trim().length<2||!/^\S+@\S+\.\S+$/.test(email.trim())||message.trim().length<10){setError('Enter your name, a valid email and a message of at least 10 characters.');return;}
    setSending(true);
    try {
      await api('public_inquiries',{}, {method:'POST',body:{name:name.trim(),email:email.trim().toLowerCase(),enquiry_type:kind,message:message.trim()},prefer:'return=minimal'});
      setSent(true); setName(''); setEmail(''); setMessage(''); setWebsite('');
    } catch { setError('Submission could not be saved. Please try again in a moment.'); }
    finally { setSending(false); }
  };
  return <section className="no-section"><form className="no-contact-form" onSubmit={submit}>
    <div><span className="no-kicker">{join?'APPLICATION ENQUIRY':'CONTACT NOVA ORIGIN'}</span><h2>{join?'TELL US YOUR':'START THE'}<br/><em>{join?'STORY.':'CONVERSATION.'}</em></h2><p>Your enquiry is securely submitted to NOVA Origin. We only collect the details needed to respond to your message.</p>{sent&&<p className="no-form-success" role="status">ENQUIRY RECEIVED — THANK YOU. YOUR MESSAGE HAS BEEN SAVED.</p>}</div>
    <div className="no-form-fields">
      <label>YOUR NAME<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name"/></label>
      <label>EMAIL ADDRESS<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={160} autoComplete="email"/></label>
      <label>ENQUIRY TYPE<select value={kind} onChange={e=>setKind(e.target.value)}><option>Player application</option><option>Team application</option><option>Partnership inquiry</option><option>General enquiry</option></select></label>
      <label>YOUR MESSAGE<textarea rows={5} value={message} onChange={e=>setMessage(e.target.value)} required minLength={10} maxLength={2000}/></label>
      <label className="no-honeypot" aria-hidden="true">WEBSITE<input value={website} onChange={e=>setWebsite(e.target.value)} tabIndex={-1} autoComplete="off"/></label>
      {error&&<span className="no-form-error" role="alert">{error}</span>}
      <button className="no-btn" type="submit" disabled={sending}>{sending?'SENDING…':sent?'SEND ANOTHER ENQUIRY':'SUBMIT ENQUIRY'} <ArrowUpRight size={16}/></button>
    </div>
  </form></section>;
}
